import { getToken, isLoggedIn, isAuthorized } from "./auth";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Errore sconosciuto");
  }
  return res.json();
}

export { isLoggedIn, isAuthorized };

export const api = {
  getRecipes: () => request("/recipes"),
  getRecipe: (id) => request(`/recipes/${id}`),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  getCategories: () => request("/categories"),
  addFromUrl: (url) =>
    request("/recipes/from-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  addFromText: (text) =>
    request("/recipes/from-text", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  addManual: (recipe) =>
    request("/recipes", { method: "POST", body: JSON.stringify(recipe) }),
  updateRecipe: (id, recipe) =>
    request(`/recipes/${id}`, { method: "PUT", body: JSON.stringify(recipe) }),
  deleteRecipe: (id) => request(`/recipes/${id}`, { method: "DELETE" }),
};
