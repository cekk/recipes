import { useState } from "react";
import { useNavigate } from "react-router";
import { api, isAuthorized } from "../api";

const TABS = ["URL", "Testo", "Manuale"];

const EMPTY_MANUAL = {
  title: "",
  description: "",
  ingredients: "",
  steps: "",
  prep_time: "",
  cook_time: "",
  servings: "",
  difficulty: "",
  categories: "",
  image_urls: "",
  video_urls: "",
  notes: "",
};

export default function AddRecipePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [manual, setManual] = useState(EMPTY_MANUAL);
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
        const payload = {
          title: manual.title,
          description: manual.description || null,
          ingredients: manual.ingredients
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          steps: manual.steps
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          prep_time: manual.prep_time ? parseInt(manual.prep_time) : null,
          cook_time: manual.cook_time ? parseInt(manual.cook_time) : null,
          servings: manual.servings ? parseInt(manual.servings) : null,
          difficulty: manual.difficulty || null,
          categories: manual.categories
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          image_urls: manual.image_urls
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          video_urls: manual.video_urls
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          notes: manual.notes || null,
          source_type: "manual",
        };
        recipe = await api.addManual(payload);
      }
      setSuccess(`✅ "${recipe.title}" salvata!`);
      setTimeout(() => navigate(`/recipe/${recipe.id}`), 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized()) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 text-center">
          <h2 className="text-xl font-bold mb-1">Accesso richiesto</h2>
          <p className="text-stone-500 text-sm">
            Effettua il login con Google dal menu in alto per aggiungere ricette.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-5">Aggiungi una ricetta</h1>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 mb-6">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === i
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL */}
        {tab === 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              URL della ricetta
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://www.giallozafferano.it/…"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-xs text-stone-400 mt-1">
              Incolla l'URL della ricetta: l'AI estrarrà automaticamente tutti i
              dati.
            </p>
          </div>
        )}

        {/* Testo */}
        {tab === 1 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Testo della ricetta
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              rows={10}
              placeholder="Incolla il testo della ricetta oppure scrivila tu…"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            />
            <p className="text-xs text-stone-400 mt-1">
              L'AI strutturerà automaticamente ingredienti, dosi e passaggi.
            </p>
          </div>
        )}

        {/* Manuale */}
        {tab === 2 && (
          <div className="space-y-3">
            <Field
              label="Titolo *"
              value={manual.title}
              onChange={(v) => setManual((p) => ({ ...p, title: v }))}
              required
            />
            <Field
              label="Descrizione"
              value={manual.description}
              onChange={(v) => setManual((p) => ({ ...p, description: v }))}
              multiline
              rows={2}
            />
            <Field
              label="Ingredienti (uno per riga)"
              value={manual.ingredients}
              onChange={(v) => setManual((p) => ({ ...p, ingredients: v }))}
              multiline
              rows={5}
              placeholder="200g di pasta&#10;2 uova&#10;50g di guanciale"
            />
            <Field
              label="Passaggi (uno per riga)"
              value={manual.steps}
              onChange={(v) => setManual((p) => ({ ...p, steps: v }))}
              multiline
              rows={5}
              placeholder="Fare bollire l'acqua…&#10;Nel frattempo…"
            />
            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Prep (min)"
                value={manual.prep_time}
                onChange={(v) => setManual((p) => ({ ...p, prep_time: v }))}
                type="number"
              />
              <Field
                label="Cottura (min)"
                value={manual.cook_time}
                onChange={(v) => setManual((p) => ({ ...p, cook_time: v }))}
                type="number"
              />
              <Field
                label="Porzioni"
                value={manual.servings}
                onChange={(v) => setManual((p) => ({ ...p, servings: v }))}
                type="number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Difficoltà
              </label>
              <select
                value={manual.difficulty}
                onChange={(e) =>
                  setManual((p) => ({ ...p, difficulty: e.target.value }))
                }
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">— Seleziona —</option>
                <option value="facile">Facile</option>
                <option value="medio">Medio</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
            <Field
              label="Categorie (separate da virgola)"
              value={manual.categories}
              onChange={(v) => setManual((p) => ({ ...p, categories: v }))}
              placeholder="primi, vegetariano, veloce"
            />
            <Field
              label="Immagini URL (separate da virgola)"
              value={manual.image_urls}
              onChange={(v) => setManual((p) => ({ ...p, image_urls: v }))}
              placeholder="https://...jpg, https://...png"
            />
            <Field
              label="Video URL (separate da virgola)"
              value={manual.video_urls}
              onChange={(v) => setManual((p) => ({ ...p, video_urls: v }))}
              placeholder="https://youtube.com/..."
            />
            <Field
              label="Note"
              value={manual.notes}
              onChange={(v) => setManual((p) => ({ ...p, notes: v }))}
              multiline
              rows={2}
            />
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {loading ? "Elaborazione in corso…" : "Salva ricetta"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  type = "text",
  required,
  placeholder,
}) {
  const cls =
    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          required={required}
          placeholder={placeholder}
          className={`${cls} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}
