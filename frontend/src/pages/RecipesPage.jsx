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
      <div className="flex justify-center items-center py-32 text-slate-400">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-medium">Caricamento ricette…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-red-100 max-w-2xl mx-auto mt-10">
        <p className="text-red-500 text-5xl mb-4">⚠️</p>
        <p className="text-slate-900 text-xl font-bold mb-2">Errore di caricamento</p>
        <p className="text-red-600 font-medium mb-1">{error}</p>
        <p className="text-slate-500 text-sm">
          Controlla che il backend sia raggiungibile.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Section */}
      <section className="text-center mt-8 mb-4 max-w-4xl mx-auto w-full px-4">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
          Cosa ti va di <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">cucinare</span> oggi?
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          Cerca tra le tue ricette preferite per ingrediente, tempo o usa l'AI per farti suggerire qualcosa di speciale.
        </p>
        
        <div className="relative">
          <div className="absolute inset-x-0 -top-10 -bottom-10 bg-indigo-50 blur-3xl -z-10 rounded-full opacity-50"></div>
          <SearchBar onSearch={handleSearch} loading={searching} />
        </div>
      </section>

      {/* Main Content Area */}
      <div className="w-full">
        {/* Categories */}
        {categories.length > 0 && !searchResults && (
          <div className="flex flex-wrap justify-center gap-2.5 mb-10 max-w-5xl mx-auto">
            <button
              onClick={() => setSelectedCat("")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                !selectedCat
                  ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2"
                  : "bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200"
              }`}
            >
              Tutte
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                  selectedCat === cat
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2"
                    : "bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Results Metadata */}
        {searchResults !== null && (
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">
              Risultati di ricerca
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {displayed.length} element{displayed.length === 1 ? "o" : "i"}
              </span>
              <button
                onClick={() => setSearchResults(null)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Torna a tutte
              </button>
            </div>
          </div>
        )}

        {/* Recipe Grid */}
        {displayed.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100 mt-8">
            <p className="text-5xl mb-4 opacity-50">🍽️</p>
            <p className="text-xl font-bold text-slate-900 mb-2">Nessuna ricetta trovata</p>
            <p className="text-slate-500">Prova a cambiare i termini di ricerca o la categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {displayed.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
