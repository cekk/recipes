import { useState } from "react";

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState(true);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(query.trim(), semantic);
  }

  function handleClear() {
    setQuery("");
    onSearch("", semantic);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca una ricetta… es. 'pasta veloce' o 'cosa faccio con le zucchine'"
          className="w-full border border-stone-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        )}
      </div>

      <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={semantic}
          onChange={(e) => setSemantic(e.target.checked)}
          className="rounded accent-amber-500"
        />
        AI
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? "…" : "Cerca"}
      </button>
    </form>
  );
}
