import { useState, useEffect, useMemo } from "react";
import { api } from "../api";
import RecipeCard from "../components/RecipeCard";
import SearchBar from "../components/SearchBar";

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

  const displayed = useMemo(() => {
    const base = searchResults ?? allRecipes;
    return selectedCat
      ? base.filter((r) => r.categories.includes(selectedCat))
      : base;
  }, [allRecipes, searchResults, selectedCat]);

  async function handleSearch(query, semantic) {
    if (!query) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await api.search(query, semantic);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-stone-400">
        Caricamento ricette…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Errore: {error}</p>
        <p className="text-stone-500 text-sm mt-1">
          Controlla che il backend sia raggiungibile.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <SearchBar onSearch={handleSearch} loading={searching} />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCat === cat
                  ? "bg-amber-500 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {searchResults !== null && (
        <p className="text-sm text-stone-500 mb-4">
          {displayed.length} risultat{displayed.length === 1 ? "o" : "i"}{" "}
          trovati
          <button
            onClick={() => setSearchResults(null)}
            className="ml-2 text-amber-600 hover:underline"
          >
            Mostra tutto
          </button>
        </p>
      )}

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">🍴</p>
          <p>Nessuna ricetta trovata.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
