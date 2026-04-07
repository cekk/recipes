.PHONY: help dev dev-backend dev-frontend up down logs bot \
        pi-up pi-down pi-setup rebuild-index install lint

# Mostra questo help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ─── Sviluppo locale ──────────────────────────────────────────────────────────

dev: ## Avvia backend e frontend in sviluppo (senza Docker)
	@make -j2 dev-backend dev-frontend

dev-backend: ## Avvia solo il backend (FastAPI + hot reload)
	cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Avvia solo il frontend (Vite dev server)
	cd frontend && npm run dev

install: ## Installa le dipendenze (backend uv + frontend npm)
	cd backend && uv sync
	cd frontend && npm install

# ─── Docker ─────────────────────────────────────────

up: ## Avvia l'app con Docker Compose (Mac, override automatico)
	docker compose up -d --build

down: ## Ferma i container
	docker compose down

logs: ## Segue i log di tutti i container
	docker compose logs -f

rebuild: ## Ribuilda le immagini senza cache
	docker compose build --no-cache

# ─── Raspberry Pi (produzione) ───────────────────────────────────────────────

pi-up: ## Avvia su Raspberry Pi (ignora l'override Mac)
	docker compose -f docker-compose.yml up -d --build

pi-down: ## Ferma i container sul Pi
	docker compose -f docker-compose.yml down

# ─── Bot Telegram ─────────────────────────────────────────────────────────────

bot: ## Avvia il bot Telegram (richiede .env configurato)
	cd backend && uv run python bot.py

# ─── Utilità ──────────────────────────────────────────────────────────────────

rebuild-index: ## Ricostruisce l'indice su GitHub da tutti i file ricette
	curl -s -X POST http://localhost:8000/admin/rebuild-index \
		-H "X-API-Key: $$(grep API_KEY .env | cut -d= -f2)" | python3 -m json.tool

lint: ## Controlla il codice Python con ruff
	cd backend && uv run ruff check .

test: ## Esegue i test del backend
	cd backend && uv run pytest
