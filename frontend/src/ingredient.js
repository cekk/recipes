// Splits a free-text ingredient ("320 g di spaghetti", "Sale q.b.") into
// { qty, name } so the quantity can be shown aligned on the right.
// Anything that doesn't look like "quantity + ingredient" is returned whole as the name.

const NUMBER = String.raw`(?:(?:0|[1-9]\d*)(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?|\d+\/\d+|[½¼¾⅓⅔])`;
const UNIT = String.raw`(?:kg|gr?|mg|l|dl|cl|ml|cucchiai(?:o|ni|no)?|cucchiaini?|bicchier[ei]|tazz(?:a|e|ina|ine)|pizzic(?:o|hi)|spicchi?o?|fett(?:a|e|ine)|fogli(?:a|e)|ramett?[io]|mazzett?[io]|bustin(?:a|e)|confezion(?:e|i)|lattin(?:a|e)|pz)\.?`;

const LEADING = new RegExp(String.raw`^(${NUMBER}(?:\s*${UNIT})?)\s+(?:di\s+|d['’]\s*)?(.+)$`, "i");
const TRAILING_QB = /^(.+?)[\s,]+(q\.?\s?b\.?|quanto basta)$/i;
const TRAILING_QTY = new RegExp(String.raw`^(.+?)[\s,:]+(${NUMBER}\s*${UNIT})$`, "i");

const tidy = (s) => {
  const t = s.trim().replace(/[,;:]$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function parseIngredient(text = "") {
  const s = text.trim();
  let m = s.match(LEADING);
  if (m) return { qty: m[1].trim(), name: tidy(m[2]) };
  m = s.match(TRAILING_QB);
  if (m) return { qty: "q.b.", name: tidy(m[1]) };
  m = s.match(TRAILING_QTY);
  if (m) return { qty: m[2].trim(), name: tidy(m[1]) };
  return { qty: "", name: s };
}
