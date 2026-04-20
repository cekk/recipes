import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, isAuthorized } from "../api";

export default function EditRecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthorized()) {
      setError("Effettua il login con Google per modificare le ricette.");
      setLoading(false);
      return;
    }

    api
      .getRecipe(id)
      .then((data) => {
        // Convert arrays to strings for editing
        setRecipe({
          ...data,
          ingredients: data.ingredients?.join("\n") || "",
          steps: data.steps?.join("\n") || "",
          categories: data.categories?.join(", ") || "",
          image_urls: data.image_urls?.join(", ") || "",
          video_urls: data.video_urls?.join(", ") || "",
          prep_time: data.prep_time || "",
          cook_time: data.cook_time || "",
          servings: data.servings || "",
          difficulty: data.difficulty || "",
          description: data.description || "",
          notes: data.notes || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        title: recipe.title,
        description: recipe.description || null,
        ingredients: recipe.ingredients
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        steps: recipe.steps
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        prep_time: recipe.prep_time ? parseInt(recipe.prep_time) : null,
        cook_time: recipe.cook_time ? parseInt(recipe.cook_time) : null,
        servings: recipe.servings ? parseInt(recipe.servings) : null,
        difficulty: recipe.difficulty || null,
        categories: recipe.categories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        image_urls: recipe.image_urls
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        video_urls: recipe.video_urls
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: recipe.notes || null,
        source_type: recipe.source_type,
        source_url: recipe.source_url,
      };

      await api.updateRecipe(id, payload);
      navigate(`/recipe/${id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20">Caricamento…</div>;
  if (!recipe) return <div className="text-center py-20 text-red-600">{error || "Ricetta non trovata"}</div>;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-5">Modifica Ricetta</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-3">
          <Field
            label="Titolo *"
            value={recipe.title}
            onChange={(v) => setRecipe((p) => ({ ...p, title: v }))}
            required
          />
          <Field
            label="Descrizione"
            value={recipe.description}
            onChange={(v) => setRecipe((p) => ({ ...p, description: v }))}
            multiline
            rows={2}
          />
          <Field
            label="Ingredienti (uno per riga)"
            value={recipe.ingredients}
            onChange={(v) => setRecipe((p) => ({ ...p, ingredients: v }))}
            multiline
            rows={5}
          />
          <Field
            label="Passaggi (uno per riga)"
            value={recipe.steps}
            onChange={(v) => setRecipe((p) => ({ ...p, steps: v }))}
            multiline
            rows={5}
          />
          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Prep (min)"
              value={recipe.prep_time}
              onChange={(v) => setRecipe((p) => ({ ...p, prep_time: v }))}
              type="number"
            />
            <Field
              label="Cottura (min)"
              value={recipe.cook_time}
              onChange={(v) => setRecipe((p) => ({ ...p, cook_time: v }))}
              type="number"
            />
            <Field
              label="Porzioni"
              value={recipe.servings}
              onChange={(v) => setRecipe((p) => ({ ...p, servings: v }))}
              type="number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficoltà</label>
            <select
              value={recipe.difficulty}
              onChange={(e) => setRecipe((p) => ({ ...p, difficulty: e.target.value }))}
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
            value={recipe.categories}
            onChange={(v) => setRecipe((p) => ({ ...p, categories: v }))}
          />
          <Field
            label="Immagini URL (separate da virgola)"
            value={recipe.image_urls}
            onChange={(v) => setRecipe((p) => ({ ...p, image_urls: v }))}
          />
          <Field
            label="Video URL (separate da virgola)"
            value={recipe.video_urls}
            onChange={(v) => setRecipe((p) => ({ ...p, video_urls: v }))}
          />
          <Field
            label="Note"
            value={recipe.notes}
            onChange={(v) => setRecipe((p) => ({ ...p, notes: v }))}
            multiline
            rows={2}
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/recipe/${id}`)}
            className="w-1/3 bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium py-2.5 rounded-xl transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-2/3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saving ? "Salvataggio..." : "Salva Modifiche"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, multiline, rows = 3, type = "text", required }) {
  const cls = "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          required={required}
          className={`${cls} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cls}
        />
      )}
    </div>
  );
}
