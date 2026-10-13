import { useState, useEffect, useMemo } from "react";
import { api } from "../api";
import RecipeCard from "../components/RecipeCard";
import SearchBar from "../components/SearchBar";
import { Loading, Message } from "../components/PageState";
import { categoryTone, capitalize } from "../format";

export default function RecipesPage() {
  const [allRecipes, setAllRecipes] = useState([]);
  const [searchResults, setSearchResults] = useState(null); // null = no search active
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getRecipes(), api.getCategories()])
      .then(([recipes, cats]) => {
        setAllRecipes(recipes);
        setCategories(cats);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const base = searchResults ?? allRecipes;

  const displayed = useMemo(
    () => (selectedCat ? base.filter((r) => r.categories.includes(selectedCat)) : base),
    [base, selectedCat],
  );

  const chips = useMemo(
    () =>
      categories
        .map((cat) => ({ cat, count: base.filter((r) => r.categories.includes(cat)).length }))
        .filter((c) => c.count > 0 || c.cat === selectedCat),
    [categories, base, selectedCat],
  );

  async function handleSearch(query) {
    if (!query) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await api.search(query);
      setSearchResults(results.map((r) => r.recipe));
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }

  function toggleCategory(cat) {
    setSelectedCat((prev) => (prev === cat ? "" : cat));
  }

  if (loading) return <Loading label="Caricamento ricette…" />;

  if (error) {
    return (
      <Message title="Errore di caricamento" tone="error">
        <p className="text-danger font-semibold">{error}</p>
        <p className="text-sm mt-1">Controlla che il backend sia raggiungibile.</p>
      </Message>
    );
  }

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] md:text-sm font-semibold text-muted">
            {allRecipes.length} {allRecipes.length === 1 ? "ricetta" : "ricette"} nel ricettario
          </p>
          <h1 className="font-display text-[34px] md:text-[clamp(36px,5vw,60px)] leading-none tracking-[-0.025em]">
            Cosa cuciniamo oggi?
          </h1>
        </div>
        <div className="md:flex-[0_1_460px]">
          <SearchBar onSearch={handleSearch} loading={searching} />
        </div>
      </section>

      {chips.length > 0 && (
        <section
          aria-label="Categorie"
          className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible"
        >
          <CategoryChip label="Tutte" count={base.length} active={!selectedCat} onClick={() => setSelectedCat("")} />
          {chips.map(({ cat, count }) => (
            <CategoryChip
              key={cat}
              label={capitalize(cat)}
              count={count}
              color={categoryTone(cat).solid}
              active={selectedCat === cat}
              onClick={() => toggleCategory(cat)}
            />
          ))}
        </section>
      )}

      {searchResults !== null && (
        <div className="flex items-center justify-between gap-4 bg-cream rounded-2xl px-4 py-2">
          <p className="font-extrabold">
            {displayed.length} {displayed.length === 1 ? "risultato" : "risultati"}
          </p>
          <button
            onClick={() => setSearchResults(null)}
            className="min-h-11 font-extrabold text-cobalt hover:text-cobalt-dark"
          >
            Mostra tutte
          </button>
        </div>
      )}

      {displayed.length === 0 ? (
        <Message title="Nessuna ricetta trovata">
          Prova a cambiare i termini di ricerca o la categoria.
        </Message>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-3 gap-y-5 md:gap-x-5 md:gap-y-8 md:mt-2">
          {displayed.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ label, count, color = "bg-white", active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1.5 min-h-10 md:min-h-11 px-3.5 md:px-4 rounded-full border-2 border-ink text-sm md:text-[15px] font-extrabold transition-colors ${
        active ? "bg-ink text-white" : `${color} text-ink`
      }`}
    >
      {label}
      <span className="font-semibold opacity-70">{count}</span>
    </button>
  );
}
