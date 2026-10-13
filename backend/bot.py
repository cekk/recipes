import hashlib
import logging
from collections import deque

import httpx
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from config import get_settings

API_BASE = "http://localhost:8000"

logger = logging.getLogger(__name__)

_SEEN_MAX = 200
_seen_update_ids: deque[int] = deque(maxlen=_SEEN_MAX)
_seen_update_ids_set: set[int] = set()

_application: Application | None = None


def _auth_headers() -> dict:
    return {"X-API-Key": get_settings().api_key}


def webhook_secret() -> str:
    """Secret token for the Telegram webhook, derived from API_KEY."""
    return hashlib.sha256(f"telegram-webhook:{get_settings().api_key}".encode()).hexdigest()


def _is_allowed(update: Update) -> bool:
    allowed_id = get_settings().telegram_allowed_user_id
    if allowed_id == 0:
        logger.warning("TELEGRAM_ALLOWED_USER_ID non impostato: il bot rifiuta tutti. Impostalo per usare il bot.")
        return False
    return update.effective_user is not None and update.effective_user.id == allowed_id


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🍽️ *Ricette Bot*\n\n"
        "Mandami:\n"
        "• Un URL di una ricetta\n"
        "• Del testo con una ricetta\n\n"
        "Comandi:\n"
        "/list — ultime ricette salvate\n"
        "/search \\<query\\> — cerca una ricetta",
        parse_mode="MarkdownV2",
    )


async def cmd_list(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_allowed(update):
        await update.message.reply_text("Non sei autorizzato.")
        return
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{API_BASE}/recipes")
    recipes = r.json()[:5]
    if not recipes:
        await update.message.reply_text("Nessuna ricetta salvata.")
        return
    lines = ["📚 *Ultime ricette:*\n"]
    for rec in recipes:
        cats = ", ".join(rec.get("categories", []))
        lines.append(f"• *{rec['title']}*" + (f" — {cats}" if cats else ""))
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_search(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_allowed(update):
        await update.message.reply_text("Non sei autorizzato.")
        return
    query = " ".join(context.args)
    if not query:
        await update.message.reply_text("Uso: /search <query>")
        return
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(f"{API_BASE}/search", params={"q": query})
    results = r.json()
    if not results:
        await update.message.reply_text("Nessun risultato trovato.")
        return
    lines = [f"🔍 *Risultati per '{query}':*\n"]
    for item in results[:5]:
        rec = item["recipe"]
        lines.append(f"• *{rec['title']}* ({rec.get('difficulty', '?')})")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_allowed(update):
        await update.message.reply_text("Non sei autorizzato.")
        return

    text = update.message.text.strip()
    await update.message.reply_text("⏳ Elaborazione in corso...")

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            if text.startswith("http://") or text.startswith("https://"):
                r = await client.post(
                    f"{API_BASE}/recipes/from-url",
                    json={"url": text},
                    headers=_auth_headers(),
                )
            else:
                r = await client.post(
                    f"{API_BASE}/recipes/from-text",
                    json={"text": text},
                    headers=_auth_headers(),
                )
        r.raise_for_status()
        recipe = r.json()
        cats = ", ".join(recipe.get("categories", []))
        await update.message.reply_text(
            f"✅ *{recipe['title']}* salvata!\n\n"
            f"{recipe.get('description', '')}\n\n"
            f"Categorie: {cats}\n"
            f"Difficoltà: {recipe.get('difficulty', 'N/D')}",
            parse_mode="Markdown",
        )
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 409:
            await update.message.reply_text("⚠️ Questa ricetta è già presente nel database.")
        else:
            await update.message.reply_text(f"❌ Errore API: {exc.response.status_code} - {exc.response.text}")
    except Exception as exc:
        await update.message.reply_text(f"❌ Errore: {exc}")


async def _error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    logger.error("Errore durante la gestione di un update Telegram", exc_info=context.error)


def _build_application(webhook: bool = False) -> Application:
    settings = get_settings()
    builder = Application.builder().token(settings.telegram_bot_token)
    if webhook:
        # Webhook mode: updates are fed via update_queue, no Updater needed
        builder = builder.updater(None)
    application = builder.build()
    application.add_error_handler(_error_handler)
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("list", cmd_list))
    application.add_handler(CommandHandler("search", cmd_search))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )
    return application


async def setup_webhook(base_url: str):
    """Initialize bot and set Telegram webhook. Call on FastAPI startup."""
    global _application
    settings = get_settings()
    if not settings.telegram_bot_token:
        print("TELEGRAM_BOT_TOKEN non configurato, webhook bot non attivato.")
        return

    _application = _build_application(webhook=True)
    await _application.initialize()
    await _application.start()

    webhook_url = f"{base_url}/telegram/webhook"
    await _application.bot.set_webhook(url=webhook_url, secret_token=webhook_secret())
    print(f"Bot Telegram webhook impostato su: {webhook_url}")


async def shutdown_webhook():
    """Cleanup on FastAPI shutdown."""
    global _application
    if _application:
        await _application.stop()
        await _application.shutdown()
        _application = None


async def process_update(payload: dict):
    """Process an incoming Telegram update from the webhook endpoint."""
    if _application is None:
        return
    update_id = payload.get("update_id")
    if update_id is not None:
        if update_id in _seen_update_ids_set:
            return
        if len(_seen_update_ids) == _SEEN_MAX:
            _seen_update_ids_set.discard(_seen_update_ids[0])
        _seen_update_ids.append(update_id)
        _seen_update_ids_set.add(update_id)
    update = Update.de_json(payload, _application.bot)
    await _application.update_queue.put(update)


def run_bot():
    """Run bot in polling mode (for local development only)."""
    settings = get_settings()
    if not settings.telegram_bot_token:
        print("TELEGRAM_BOT_TOKEN non configurato, bot non avviato.")
        return

    application = _build_application()
    print("Bot Telegram avviato (polling).")
    application.run_polling()


if __name__ == "__main__":
    run_bot()
