import { useState } from "react";

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(query.trim());
  }

  function handleClear() {
    setQuery("");
    onSearch("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-3xl mx-auto"
    >
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-slate-400">🔍</span>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca una ricetta… es. 'pasta veloce' o 'zucchine'"
          className="w-full border-0 rounded-2xl pl-11 pr-12 py-4 text-base sm:text-lg text-slate-900 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-white"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full"
          >
            ✕
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-4 rounded-2xl text-base font-semibold shadow-xl shadow-indigo-200 transition-all hover:shadow-indigo-300 hover:-translate-y-0.5"
      >
        {loading ? "Cerco..." : "Cerca"}
      </button>
    </form>
  );
}
