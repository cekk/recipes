import { useRef, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { isLoggedIn, getUser, logout, renderGoogleButton, initGoogleAuth } from "../auth";
import { PlusIcon } from "./Icons";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function useAuthState() {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const authorized = loggedIn && user && (() => {
    const allowed = (import.meta.env.VITE_ALLOWED_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    return allowed.length === 0 || allowed.includes(user.email);
  })();
  return { user, loggedIn, authorized };
}

export function Logo({ className = "" }) {
  return (
    <Link
      to="/"
      className={`inline-flex bg-lemon border-2 border-ink rounded-xl px-3 py-1 -rotate-2 font-display text-lg md:text-xl text-ink ${className}`}
    >
      RICETTE!
    </Link>
  );
}

export default function Header() {
  const location = useLocation();
  const { user, loggedIn, authorized } = useAuthState();
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
    <header className="bg-white md:border-b-[1.5px] md:border-line md:sticky md:top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 md:min-h-[76px] py-2 flex items-center justify-between gap-4">
        <Logo />
        <nav className="flex items-center gap-2.5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `hidden md:inline-flex items-center min-h-11 px-3.5 rounded-full text-[15px] font-extrabold ${
                isActive ? "bg-cream" : "hover:bg-cream"
              }`
            }
          >
            Ricette
          </NavLink>
          {loggedIn && (
            <>
              {authorized && (
                <Link
                  to="/add"
                  className="hidden md:inline-flex items-center gap-2 min-h-11 px-4.5 rounded-full bg-tomato border-2 border-ink shadow-hard text-[15px] font-extrabold hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg transition-[translate,box-shadow]"
                >
                  <PlusIcon strokeWidth={2.6} />
                  Aggiungi
                </Link>
              )}
              <div className="hidden md:flex items-center gap-2 ml-1.5">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-11 h-11 rounded-full border-2 border-ink" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-11 h-11 rounded-full border-2 border-ink bg-sky inline-flex items-center justify-center font-extrabold">
                    {user?.name?.[0] || "?"}
                  </span>
                )}
                <button onClick={logout} className="min-h-11 px-2 text-[15px] font-bold text-muted hover:text-danger">
                  Esci
                </button>
              </div>
            </>
          )}
          {!loggedIn && <div ref={googleBtnRef} className="min-w-[120px]" />}
        </nav>
      </div>
    </header>
  );
}
