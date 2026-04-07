import { Link, useLocation } from "react-router-dom";
import { hasApiKey } from "../api";

export default function Header() {
  const location = useLocation();

  return (
    <header className="bg-amber-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold tracking-tight hover:opacity-90"
        >
          🍽️ Le mie ricette
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className={`text-sm font-medium hover:underline ${
              location.pathname === "/" ? "underline" : ""
            }`}
          >
            Tutte le ricette
          </Link>
          {hasApiKey() && (
            <Link
              to="/add"
              className="bg-white text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
            >
              + Aggiungi
            </Link>
          )}
          {!hasApiKey() && (
            <Link
              to="/add"
              className="text-sm font-medium hover:underline opacity-80"
            >
              Accedi
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
