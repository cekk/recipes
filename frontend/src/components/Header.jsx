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
          {loggedIn && (
            <>
              {authorized && (
                <Link
                  to="/add"
                  className="bg-white text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  + Aggiungi
                </Link>
              )}
              <div className="flex items-center gap-2">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border-2 border-white/50"
                    referrerPolicy="no-referrer"
                  />
                )}
                <button
                  onClick={logout}
                  className="text-sm opacity-80 hover:opacity-100 hover:underline"
                >
                  Esci
                </button>
              </div>
            </>
          )}
          {!loggedIn && (
            <div ref={googleBtnRef} className="min-w-[120px]" />
          )}
        </nav>
      </div>
    </header>
  );
}
