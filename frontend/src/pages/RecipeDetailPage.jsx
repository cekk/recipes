import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { api, isAuthorized } from "../api";
import { formatTime, categoryTone, capitalize } from "../format";
import { parseIngredient } from "../ingredient";
import { Loading, Message } from "../components/PageState";
import { CategoryPill } from "../components/RecipeCard";
import { BackIcon, PencilIcon, TrashIcon, CheckIcon, PlayIcon, PlateIllustration } from "../components/Icons";

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const roundButton =
  "w-11 h-11 rounded-full bg-white border-2 border-ink flex items-center justify-center text-ink";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState({});
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState("ingredients");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getRecipe(id)
      .then(setRecipe)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Eliminare "${recipe.title}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteRecipe(id);
      navigate("/");
    } catch (e) {
      alert("Errore durante l'eliminazione: " + e.message);
      setDeleting(false);
    }
  }

  function toggleIngredient(i) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  if (loading) return <Loading />;
  if (error) return <Message title="Errore" tone="error">{error}</Message>;
  if (!recipe) return <Message title="Ricetta non trovata" />;

  const canEdit = isAuthorized();
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const images = recipe.image_urls || [];
  const tint = categoryTone(recipe.categories[0]).tint;
  const doneCount = recipe.ingredients.filter((_, i) => checked[i]).length;
  const timeDetail = [
    recipe.prep_time && `Preparazione ${formatTime(recipe.prep_time)}`,
    recipe.cook_time && `Cottura ${formatTime(recipe.cook_time)}`,
  ].filter(Boolean).join(" · ");

  const stats = [
    totalTime > 0 && { label: "Tempo", value: formatTime(totalTime), bg: "bg-lemon-tint" },
    recipe.servings && { label: "Porzioni", value: recipe.servings, bg: "bg-mint-tint" },
    recipe.difficulty && { label: "Difficoltà", value: capitalize(recipe.difficulty), bg: "bg-sky-tint" },
  ].filter(Boolean);

  const placeholder = (
    <div className={`w-full h-full flex items-center justify-center ${tint}`}>
      <PlateIllustration size={200} strokeWidth={1.5} />
    </div>
  );

  return (
    <article>
      {/* Mobile: full-bleed photo with overlay buttons */}
      <div className="md:hidden relative -mx-4 sm:-mx-6 -mt-4 h-80 bg-cream">
        {images.length > 0 ? (
          <div className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
            {images.map((url) => (
              <img key={url} src={url} alt="" className="w-full h-full shrink-0 object-cover snap-center" />
            ))}
          </div>
        ) : (
          placeholder
        )}
        <Link to="/" aria-label="Torna alle ricette" className={`absolute top-4 left-4 ${roundButton}`}>
          <BackIcon size={20} strokeWidth={2.4} />
        </Link>
        {canEdit && (
          <Link to={`/recipe/${id}/edit`} aria-label="Modifica ricetta" className={`absolute top-4 right-4 ${roundButton}`}>
            <PencilIcon size={18} strokeWidth={2.2} />
          </Link>
        )}
      </div>

      {/* Desktop: back link */}
      <Link to="/" className="hidden md:inline-flex items-center gap-1.5 min-h-11 font-extrabold text-[15px] text-ink hover:text-cobalt">
        <BackIcon strokeWidth={2.4} />
        Tutte le ricette
      </Link>

      <div className="relative -mx-4 sm:-mx-6 md:mx-0 -mt-7 md:mt-3 bg-white rounded-t-[28px] md:rounded-none border-t-2 border-ink md:border-t-0 px-4 sm:px-6 md:px-0 pt-6 md:pt-0 flex flex-col gap-4.5 md:gap-0">
        <section className="flex flex-col md:flex-row gap-4.5 md:gap-10 md:items-stretch">
          {/* Desktop: photo + thumbnails */}
          <div className="hidden md:flex md:flex-[1_1_460px] min-w-0 flex-col gap-2.5">
            <div className="aspect-[4/3] rounded-3xl border-2 border-ink overflow-hidden">
              {images.length > 0 ? (
                <img src={images[activeImage]} alt="" className="w-full h-full object-cover" />
              ) : (
                placeholder
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((url, idx) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    aria-label={`Mostra foto ${idx + 1}`}
                    aria-pressed={idx === activeImage}
                    className={`shrink-0 w-18 h-14 rounded-xl overflow-hidden border-2 ${
                      idx === activeImage ? "border-ink" : "border-line opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:flex-[1_1_440px] min-w-0 flex flex-col gap-4.5 md:justify-center">
            {recipe.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipe.categories.map((cat, i) => (
                  <CategoryPill key={cat} category={cat} solid={i === 0} />
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-[30px] md:text-[clamp(34px,4.4vw,54px)] leading-[1.05] md:leading-none tracking-[-0.02em]">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-[15px] md:text-lg leading-relaxed text-muted">{recipe.description}</p>
              )}
            </div>

            {stats.length > 0 && (
              <div className="flex flex-col gap-2">
                <dl className="grid grid-cols-3 gap-2 md:gap-2.5">
                  {stats.map(({ label, value, bg }) => (
                    <div key={label} className={`${bg} border-2 border-ink rounded-2xl px-3 py-2.5 md:px-3.5 md:py-3`}>
                      <dt className="text-[11px] md:text-xs font-bold uppercase tracking-wide text-[#4d4a44]">{label}</dt>
                      <dd className="font-display text-lg md:text-xl mt-0.5">{value}</dd>
                    </div>
                  ))}
                </dl>
                {timeDetail && <p className="text-[13px] font-semibold text-muted">{timeDetail}</p>}
              </div>
            )}

            {canEdit && (
              <div className="hidden md:flex flex-wrap gap-2.5">
                <Link
                  to={`/recipe/${id}/edit`}
                  className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full border-2 border-ink font-extrabold text-[15px] hover:bg-ink hover:text-white transition-colors"
                >
                  <PencilIcon size={16} strokeWidth={2.2} />
                  Modifica
                </Link>
                <DeleteButton onClick={handleDelete} deleting={deleting} />
              </div>
            )}
          </div>
        </section>

        {/* Mobile: switch between ingredients and steps */}
        {recipe.ingredients.length > 0 && recipe.steps.length > 0 && (
          <div role="group" aria-label="Sezione" className="md:hidden grid grid-cols-2 gap-1 bg-cream rounded-full p-1">
            {[
              ["ingredients", `Ingredienti · ${recipe.ingredients.length}`],
              ["steps", `Procedimento · ${recipe.steps.length}`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
                className={`min-h-11 rounded-full text-sm font-extrabold transition-colors ${
                  tab === key ? "bg-ink text-white" : "text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="md:mt-12 flex flex-col md:flex-row gap-4.5 md:gap-10 md:items-start">
          {recipe.ingredients.length > 0 && (
            <section
              aria-labelledby="ing-h"
              className={`${tab === "ingredients" ? "" : "hidden"} md:block md:flex-[1_1_340px] md:max-w-[420px] md:border-2 md:border-ink md:rounded-3xl md:px-5.5 md:pt-5.5 md:pb-2.5 md:sticky md:top-24`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="ing-h" className="sr-only md:not-sr-only font-display text-2xl">Ingredienti</h2>
                <p className="text-[13px] md:text-sm font-semibold text-muted">
                  {doneCount} di {recipe.ingredients.length} pronti
                  <span className="md:hidden"> · tocca per spuntare</span>
                </p>
              </div>
              <ul className="mt-1.5 md:mt-3">
                {recipe.ingredients.map((ing, i) => {
                  const { qty, name } = parseIngredient(ing);
                  const done = !!checked[i];
                  return (
                    <li key={i} className="border-b-[1.5px] md:border-b-0 md:border-t-[1.5px] border-line-soft">
                      <label className="flex items-center gap-3 min-h-[52px] md:min-h-[50px] py-1.5 cursor-pointer text-base font-semibold">
                        <input type="checkbox" checked={done} onChange={() => toggleIngredient(i)} className="peer sr-only" />
                        <span
                          aria-hidden="true"
                          className={`shrink-0 w-6 h-6 rounded-lg border-2 border-ink inline-flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cobalt ${
                            done ? "bg-mint" : "bg-white"
                          }`}
                        >
                          {done && <CheckIcon size={14} strokeWidth={3.5} />}
                        </span>
                        <span className={`flex-1 leading-snug ${done ? "text-faint line-through" : ""}`}>{name}</span>
                        {qty && (
                          <span className={`text-[15px] font-bold whitespace-nowrap ${done ? "text-faint line-through" : "text-muted"}`}>
                            {qty}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="md:flex-[999_1_460px] min-w-0 flex flex-col gap-4.5 md:gap-6">
          {recipe.steps.length > 0 && (
            <section
              aria-labelledby="steps-h"
              className={`${tab === "steps" || recipe.ingredients.length === 0 ? "flex" : "hidden"} md:flex flex-col gap-5 md:gap-5.5`}
            >
              <h2 id="steps-h" className="sr-only md:not-sr-only font-display text-2xl">Procedimento</h2>
              <ol className="flex flex-col gap-5 md:gap-5.5">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="grid grid-cols-[36px_minmax(0,1fr)] md:grid-cols-[40px_minmax(0,1fr)] gap-3 md:gap-3.5 items-start">
                    <span
                      aria-hidden="true"
                      className="w-[34px] h-[34px] md:w-[38px] md:h-[38px] rounded-full bg-cobalt text-white border-2 border-ink inline-flex items-center justify-center font-display text-[15px] md:text-base"
                    >
                      {i + 1}
                    </span>
                    <p className="mt-1 text-base md:text-[17px] leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

            {recipe.notes && (
              <aside className="bg-lemon-tint border-2 border-ink rounded-[18px] px-4 py-3.5 md:px-4.5 md:py-4 flex flex-col gap-1">
                <strong className="text-[13px] font-extrabold uppercase tracking-wide">Nota</strong>
                <p className="text-[15px] md:text-base leading-relaxed whitespace-pre-line">{recipe.notes}</p>
              </aside>
            )}

            {(recipe.video_urls?.length > 0 || recipe.source_url) && (
              <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-x-5">
                {recipe.video_urls?.map((vurl, idx) => (
                  <a
                    key={vurl}
                    href={vurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 min-h-[54px] md:min-h-12 px-5 rounded-2xl md:rounded-full bg-ink text-white font-extrabold hover:bg-[#2a2a2a]"
                  >
                    <PlayIcon />
                    Guarda il video{recipe.video_urls.length > 1 ? ` ${idx + 1}` : ""}
                  </a>
                ))}
                {recipe.source_url && (
                  <p className="text-center md:text-left text-sm md:text-[15px] text-muted">
                    Fonte:{" "}
                    <a
                      href={recipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-cobalt hover:text-cobalt-dark break-all"
                    >
                      {hostname(recipe.source_url)}
                    </a>
                  </p>
                )}
              </div>
            )}

            {canEdit && (
              <div className="md:hidden flex justify-center pt-2">
                <DeleteButton onClick={handleDelete} deleting={deleting} />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DeleteButton({ onClick, deleting }) {
  return (
    <button
      onClick={onClick}
      disabled={deleting}
      className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full border-2 border-line text-danger font-extrabold text-[15px] hover:border-danger transition-colors disabled:opacity-50"
    >
      <TrashIcon size={16} strokeWidth={2.2} />
      {deleting ? "Elimino…" : "Elimina"}
    </button>
  );
}
