// Conversion between the API recipe shape and the editable form state
// (lists become newline/comma separated strings).

export const EMPTY_FORM = {
  title: "",
  description: "",
  ingredients: "",
  steps: "",
  prep_time: "",
  cook_time: "",
  servings: "",
  difficulty: "",
  categories: "",
  image_urls: "",
  video_urls: "",
  notes: "",
};

const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const commas = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
const int = (v) => (v ? parseInt(v) : null);

export function recipeToForm(data) {
  return {
    ...data,
    ingredients: data.ingredients?.join("\n") || "",
    steps: data.steps?.join("\n") || "",
    categories: data.categories?.join(", ") || "",
    image_urls: data.image_urls?.join(", ") || "",
    video_urls: data.video_urls?.join(", ") || "",
    prep_time: data.prep_time || "",
    cook_time: data.cook_time || "",
    servings: data.servings || "",
    difficulty: data.difficulty || "",
    description: data.description || "",
    notes: data.notes || "",
  };
}

export function formToPayload(form) {
  return {
    title: form.title,
    description: form.description || null,
    ingredients: lines(form.ingredients),
    steps: lines(form.steps),
    prep_time: int(form.prep_time),
    cook_time: int(form.cook_time),
    servings: int(form.servings),
    difficulty: form.difficulty || null,
    categories: commas(form.categories),
    image_urls: commas(form.image_urls),
    video_urls: commas(form.video_urls),
    notes: form.notes || null,
  };
}
