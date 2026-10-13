export function formatTime(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export const DIFFICULTY_LEVELS = ["facile", "medio", "difficile"];

export const capitalize = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

// Each category gets a solid color (pills) and a tint (photo placeholders).
// Class names are spelled out in full so Tailwind can find them.
const TONES = {
  lemon: { solid: "bg-lemon", tint: "bg-lemon-tint" },
  tomato: { solid: "bg-tomato", tint: "bg-tomato-tint" },
  pink: { solid: "bg-pink", tint: "bg-pink-tint" },
  mint: { solid: "bg-mint", tint: "bg-mint-tint" },
  sky: { solid: "bg-sky", tint: "bg-sky-tint" },
};

const KNOWN = {
  primi: "lemon",
  pasta: "lemon",
  risotti: "lemon",
  secondi: "tomato",
  carne: "tomato",
  pesce: "sky",
  dolci: "pink",
  dessert: "pink",
  torte: "pink",
  vegetariano: "mint",
  vegano: "mint",
  contorni: "mint",
  antipasti: "sky",
};

const ORDER = Object.keys(TONES);

export function categoryTone(category = "") {
  const key = category.toLowerCase().trim();
  if (KNOWN[key]) return TONES[KNOWN[key]];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TONES[ORDER[Math.abs(h) % ORDER.length]];
}
