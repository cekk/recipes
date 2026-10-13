import { Link, NavLink } from "react-router";
import { logout } from "../auth";
import { useAuthState } from "./Header";
import { GridIcon, PlusIcon } from "./Icons";

// Bottom navigation, mobile only.
export default function TabBar() {
  const { user, loggedIn, authorized } = useAuthState();

  return (
    <nav
      aria-label="Navigazione principale"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t-[1.5px] border-line pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-3 items-start h-[72px] pt-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 min-h-12 text-xs ${
              isActive ? "text-ink font-extrabold" : "text-muted font-bold"
            }`
          }
        >
          <GridIcon size={24} strokeWidth={2.2} />
          Ricette
        </NavLink>

        {authorized ? (
          <Link
            to="/add"
            aria-label="Aggiungi ricetta"
            className="justify-self-center -mt-6 w-15 h-15 rounded-full bg-tomato border-2 border-ink shadow-hard flex items-center justify-center active:translate-x-px active:translate-y-px active:shadow-none transition"
          >
            <PlusIcon size={28} strokeWidth={2.6} />
          </Link>
        ) : (
          <span />
        )}

        {loggedIn ? (
          <button
            type="button"
            onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 min-h-12 text-xs font-bold text-muted"
          >
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-6 h-6 rounded-full border-[1.5px] border-ink" referrerPolicy="no-referrer" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-sky border-[1.5px] border-ink inline-flex items-center justify-center text-[11px] font-extrabold text-ink">
                {user?.name?.[0] || "?"}
              </span>
            )}
            Esci
          </button>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
