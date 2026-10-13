import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, isAuthorized } from "../api";
import { EMPTY_FORM, formToPayload } from "../recipeForm";
import RecipeFields, { Field, FormMessage } from "../components/RecipeFields";
import { Message } from "../components/PageState";
import { LinkIcon, TextIcon, PencilIcon, CloseIcon } from "../components/Icons";

const MODES = [
  { title: "Da un link", sub: "Un sito di ricette, un blog", Icon: LinkIcon, color: "bg-lemon" },
  { title: "Da un testo", sub: "Un messaggio, una nota", Icon: TextIcon, color: "bg-sky" },
  { title: "A mano", sub: "La ricetta di casa tua", Icon: PencilIcon, color: "bg-mint" },
];

export default function AddRecipePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [manual, setManual] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      let recipe;
      if (tab === 0) {
        recipe = await api.addFromUrl(url.trim());
      } else if (tab === 1) {
        recipe = await api.addFromText(text.trim());
      } else {
        recipe = await api.addManual({ ...formToPayload(manual), source_type: "manual" });
      }
      setSuccess(`«${recipe.title}» salvata. Ti porto alla ricetta…`);
      setTimeout(() => navigate(`/recipe/${recipe.id}`), 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized()) {
    return (
      <Message title="Accesso richiesto">
        Accedi con Google dal menu in alto per aggiungere ricette.
      </Message>
    );
  }

  const submitLabel = loading
    ? tab === 2 ? "Salvataggio…" : "Sto leggendo la ricetta…"
    : tab === 2 ? "Salva ricetta" : "Estrai e salva";

  return (
    <div className="max-w-3xl flex flex-col gap-5 md:gap-7">
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Chiudi" className="md:hidden w-11 h-11 shrink-0 rounded-full border-2 border-ink flex items-center justify-center">
          <CloseIcon size={18} strokeWidth={2.6} />
        </Link>
        <h1 className="font-display text-[26px] md:text-[clamp(36px,5vw,52px)] leading-none tracking-[-0.02em]">
          Nuova ricetta
        </h1>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="text-[13px] font-extrabold uppercase tracking-wide text-muted mb-2.5">Da dove arriva?</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
          {MODES.map(({ title, sub, Icon, color }, i) => {
            const active = tab === i;
            return (
              <button
                key={title}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(i)}
                className={`flex items-center gap-3 px-3.5 py-3 min-h-[68px] rounded-[18px] border-2 text-left transition-[background-color,border-color,box-shadow] ${
                  active ? "bg-white border-ink shadow-hard" : "bg-cream border-cream hover:border-line"
                }`}
              >
                <span className={`shrink-0 w-10 h-10 rounded-xl border-2 border-ink inline-flex items-center justify-center ${color}`}>
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span className="flex-1 flex flex-col">
                  <span className="text-base font-extrabold">{title}</span>
                  <span className="text-[13px] font-medium text-muted">{sub}</span>
                </span>
                <span aria-hidden="true" className="md:hidden shrink-0 w-[22px] h-[22px] rounded-full border-2 border-ink inline-flex items-center justify-center">
                  {active && <span className="w-2.5 h-2.5 rounded-full bg-ink" />}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {tab === 0 && (
          <div className="flex flex-col gap-2">
            <Field
              label="Link della ricetta"
              type="url"
              value={url}
              onChange={setUrl}
              required
              placeholder="https://…"
            />
            <p className="text-[13px] md:text-sm font-medium text-muted">
              Estraiamo titolo, ingredienti, passaggi, tempi e foto. Se la ricetta c'è già, te lo diciamo.
            </p>
          </div>
        )}

        {tab === 1 && (
          <div className="flex flex-col gap-2">
            <Field
              label="Testo della ricetta"
              value={text}
              onChange={setText}
              required
              multiline
              rows={8}
              placeholder="Incolla qui la ricetta, anche disordinata…"
            />
            <p className="text-[13px] md:text-sm font-medium text-muted">
              Separiamo noi ingredienti, dosi e passaggi.
            </p>
          </div>
        )}

        {tab === 2 && <RecipeFields form={manual} setForm={setManual} />}

        {error && <FormMessage>{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}

        <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 min-h-14 px-7 rounded-2xl bg-tomato border-2 border-ink shadow-hard font-display text-[17px] disabled:opacity-60 active:translate-x-px active:translate-y-px active:shadow-none transition"
          >
            {loading && <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />}
            {submitLabel}
          </button>
          <Link to="/" className="hidden md:inline-flex items-center min-h-11 font-bold text-muted hover:text-ink">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
