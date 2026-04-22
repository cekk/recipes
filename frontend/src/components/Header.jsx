import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { isLoggedIn, getUser, logout, renderGoogleButton, initGoogleAuth } from "../auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Header() {
  const location = useLocation();
  const user = getUser();
  const loggedIn = isLoggedIn();
  const authorized = loggedIn && user && (() => {
    const allowed = (import.meta.env.VITE_ALLOWED_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    return allowed.length === 0 || allowed.includes(user.email);
  })();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (GOOGLE_CLIENT_ID) {
      initGoogleAuth(GOOGLE_CLIENT_ID);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn && googleBtnRef.current && GOOGLE_CLIENT_ID) {
      renderGoogleButton(googleBtnRef.current);
    }
  }, [loggedIn, location.pathname]);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold tracking-tighter text-slate-900 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="text-indigo-600 bg-indigo-50 p-1.5 rounded-lg shadow-sm">🍽️</span> 
          <span>Le mie ricette</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors ${
              location.pathname === "/" ? "text-indigo-600 font-semibold" : ""
            }`}
          >
            Tutte le ricette
          </Link>
          {loggedIn && (
            <>
              {authorized && (
                <Link
                  to="/add"
                  className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-sm"
                >
                  + Aggiungi
                </Link>
              )}
              <div className="flex items-center gap-3 border-l border-slate-200 pl-6 ml-2">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
                <button
                  onClick={logout}
                  className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
                >
                  Esci
                </button>
              </div>
            </>
          )}
          {!loggedIn && (
            <div ref={googleBtnRef} className="min-w-[120px] ml-2" />
          )}
        </nav>
      </div>
    </header>
  );
}
