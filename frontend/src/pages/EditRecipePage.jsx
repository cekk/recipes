import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { api, isAuthorized } from "../api";
import { recipeToForm, formToPayload } from "../recipeForm";
import RecipeFields, { FormMessage } from "../components/RecipeFields";
import { Loading, Message } from "../components/PageState";
import { BackIcon } from "../components/Icons";

export default function EditRecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthorized()) {
      setError("Accedi con Google per modificare le ricette.");
      setLoading(false);
      return;
    }

    api
      .getRecipe(id)
      .then((data) => setRecipe(recipeToForm(data)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await api.updateRecipe(id, {
        ...formToPayload(recipe),
        source_type: recipe.source_type,
        source_url: recipe.source_url,
      });
      navigate(`/recipe/${id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (!recipe) return <Message title="Impossibile modificare" tone="error">{error || "Ricetta non trovata."}</Message>;

  return (
    <div className="max-w-3xl flex flex-col gap-5 md:gap-7">
      <div className="flex items-center gap-3">
        <Link
          to={`/recipe/${id}`}
          aria-label="Torna alla ricetta"
          className="w-11 h-11 shrink-0 rounded-full border-2 border-ink flex items-center justify-center hover:bg-cream"
        >
          <BackIcon size={20} strokeWidth={2.4} />
        </Link>
        <h1 className="font-display text-[26px] md:text-[clamp(32px,4.5vw,46px)] leading-none tracking-[-0.02em]">
          Modifica ricetta
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <RecipeFields form={recipe} setForm={setRecipe} />

        {error && <FormMessage>{error}</FormMessage>}

        <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t-[1.5px] border-line flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto min-h-14 px-7 rounded-2xl bg-tomato border-2 border-ink shadow-hard font-display text-[17px] disabled:opacity-60 active:translate-x-px active:translate-y-px active:shadow-none transition"
          >
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </button>
          <Link to={`/recipe/${id}`} className="hidden md:inline-flex items-center min-h-11 font-bold text-muted hover:text-ink">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
