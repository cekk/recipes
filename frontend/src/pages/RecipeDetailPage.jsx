import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, isAuthorized } from "../api";

const DIFFICULTY_COLORS = {
  facile: "bg-green-100 text-green-800",
  medio: "bg-amber-100 text-amber-800",
  difficile: "bg-red-100 text-red-800",
};

function formatTime(minutes) {
  if (!minutes) return null;
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60 || ""}`.trim();
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getRecipe(id)
      .then(setRecipe)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Eliminare "${recipe.title}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteRecipe(id);
      navigate("/");
    } catch (e) {
      alert("Errore durante l'eliminazione: " + e.message);
      setDeleting(false);
    }
  }

  function toggleIngredient(i) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  if (loading)
    return <div className="text-center py-20 text-stone-400">Caricamento…</div>;
  if (error)
    return (
      <div className="text-center py-12 text-red-600">Errore: {error}</div>
    );
  if (!recipe)
    return <div className="text-center py-12">Ricetta non trovata.</div>;

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Link to="/" className="text-amber-600 hover:underline text-sm">
          ← Torna alle ricette
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {recipe.image_urls && recipe.image_urls.length > 0 ? (
          <div className="w-full">
            <div 
              className="w-full h-64 sm:h-96 bg-cover bg-center"
              style={{ backgroundImage: `url(${recipe.image_urls[0]})` }}
            />
            {recipe.image_urls.length > 1 && (
              <div className="flex overflow-x-auto gap-2 p-2 bg-stone-100 border-b border-stone-200">
                {recipe.image_urls.slice(1).map((url, idx) => (
                  <a href={url} target="_blank" rel="noopener noreferrer" key={idx}>
                    <div 
                      className="w-24 h-24 shrink-0 bg-cover bg-center rounded shadow-sm border border-stone-200"
                      style={{ backgroundImage: `url(${url})` }}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 h-3" />
        )}
        <div className="p-6">
          {/* Titolo e azioni */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>
            {isAuthorized() && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/recipe/${id}/edit`)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Modifica
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? "…" : "Elimina"}
                </button>
              </div>
            )}
          </div>

          {recipe.description && (
            <p className="text-stone-600 mb-4">{recipe.description}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            {totalTime > 0 && (
              <span className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full">
                ⏱️ {formatTime(totalTime)}
              </span>
            )}
            {recipe.prep_time && (
              <span className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full">
                🔪 Prep: {formatTime(recipe.prep_time)}
              </span>
            )}
            {recipe.cook_time && (
              <span className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full">
                🔥 Cottura: {formatTime(recipe.cook_time)}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full">
                👤 {recipe.servings} porzioni
              </span>
            )}
            {recipe.difficulty && (
              <span
                className={`px-3 py-1 rounded-full font-medium ${
                  DIFFICULTY_COLORS[recipe.difficulty] ||
                  "bg-stone-100 text-stone-600"
                }`}
              >
                {recipe.difficulty}
              </span>
            )}
          </div>

          {/* Categorie */}
          {recipe.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {recipe.categories.map((cat) => (
                <span
                  key={cat}
                  className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          <hr className="border-stone-100 mb-5" />

          {/* Video */}
          {recipe.video_urls && recipe.video_urls.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-lg mb-3">Video</h2>
              <div className="flex gap-3">
                {recipe.video_urls.map((vurl, idx) => (
                  <a
                    key={idx}
                    href={vurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 text-sm font-medium transition-colors"
                  >
                    ▶️ Guarda Video {recipe.video_urls.length > 1 ? idx + 1 : ""}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Ingredienti */}
          {recipe.ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-lg mb-3">Ingredienti</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    onClick={() => toggleIngredient(i)}
                    className={`flex items-center gap-2 cursor-pointer text-sm transition-opacity ${
                      checked[i] ? "opacity-40 line-through" : ""
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-xs ${
                        checked[i]
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-stone-300"
                      }`}
                    >
                      {checked[i] ? "✓" : ""}
                    </span>
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Procedimento */}
          {recipe.steps.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-lg mb-3">Procedimento</h2>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-stone-700 leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Note */}
          {recipe.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-sm text-stone-700">
              <strong>💡 Note:</strong> {recipe.notes}
            </div>
          )}

          {/* Fonte */}
          {recipe.source_url && (
            <div className="text-sm text-stone-400 border-t border-stone-100 pt-4">
              Fonte:{" "}
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:underline break-all"
              >
                {recipe.source_url}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
