import { useState } from "react";
import { SearchIcon, CloseIcon } from "./Icons";

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
      role="search"
      className="flex items-center gap-2.5 w-full h-[52px] md:h-14 bg-white border-2 border-ink rounded-2xl md:rounded-[18px] pl-4 pr-1.5 focus-within:shadow-hard transition-shadow"
    >
      <SearchIcon size={20} strokeWidth={2.2} className="shrink-0" />
      <label htmlFor="recipe-search" className="sr-only">
        Cerca una ricetta
      </label>
      <input
        id="recipe-search"
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="zucchine, polpette, tiramisù…"
        className="flex-1 min-w-0 bg-transparent border-0 outline-none focus-visible:outline-none text-base font-medium placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Cancella ricerca"
          className="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-cream"
        >
          <CloseIcon size={18} strokeWidth={2.4} />
        </button>
      )}
      <button
        type="submit"
        disabled={loading}
        className={`shrink-0 h-[42px] px-4.5 rounded-xl bg-ink text-white font-extrabold disabled:opacity-60 ${
          loading ? "inline-flex items-center" : "hidden sm:inline-flex items-center"
        }`}
      >
        {loading ? "Cerco…" : "Cerca"}
      </button>
    </form>
  );
}
