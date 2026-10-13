import { useId } from "react";
import { DIFFICULTY_LEVELS } from "../format";

export const inputClass =
  "w-full box-border bg-white border-2 border-ink rounded-2xl px-4 py-3.5 text-base font-medium text-ink placeholder:text-faint outline-none focus-visible:outline-none focus:shadow-hard transition-shadow";

export function Field({ label, hint, value, onChange, multiline, rows = 3, type = "text", required, placeholder, className = "", inputClassName = "" }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-extrabold text-ink">
        {label}
        {hint && <span className="font-medium text-muted"> · {hint}</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          required={required}
          placeholder={placeholder}
          className={`${inputClass} resize-y leading-relaxed ${inputClassName}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          min={type === "number" ? 0 : undefined}
          className={`${inputClass} ${inputClassName}`}
        />
      )}
    </div>
  );
}

function DifficultyPicker({ value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-extrabold text-ink mb-2">Difficoltà</legend>
      <div className="inline-flex self-start bg-white border-2 border-ink rounded-2xl overflow-hidden">
        {DIFFICULTY_LEVELS.map((level, i) => {
          const active = value === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : level)}
              className={`min-h-11 px-4.5 text-[15px] font-extrabold capitalize transition-colors ${
                i > 0 ? "border-l-2 border-ink" : ""
              } ${active ? "bg-ink text-white" : "text-ink hover:bg-cream"}`}
            >
              {level}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// The full set of editable recipe fields, shared by the add (manual) and edit pages.
export default function RecipeFields({ form, setForm }) {
  const set = (key) => (v) => setForm((p) => ({ ...p, [key]: v }));
  return (
    <div className="flex flex-col gap-5">
      <Field label="Titolo" value={form.title} onChange={set("title")} required placeholder="Es. Pasta e ceci" />
      <Field label="Descrizione" hint="facoltativa" value={form.description} onChange={set("description")} multiline rows={2} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Ingredienti"
          hint="uno per riga"
          value={form.ingredients}
          onChange={set("ingredients")}
          multiline
          rows={8}
          placeholder={"200 g di pasta\n2 uova\n50 g di guanciale"}
        />
        <Field
          label="Passaggi"
          hint="uno per riga"
          value={form.steps}
          onChange={set("steps")}
          multiline
          rows={8}
          placeholder={"Porta a bollore l'acqua…\nNel frattempo…"}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Prep. (min)" value={form.prep_time} onChange={set("prep_time")} type="number" />
        <Field label="Cottura (min)" value={form.cook_time} onChange={set("cook_time")} type="number" />
        <Field label="Porzioni" value={form.servings} onChange={set("servings")} type="number" />
      </div>
      <DifficultyPicker value={form.difficulty} onChange={set("difficulty")} />
      <Field label="Categorie" hint="separate da virgola" value={form.categories} onChange={set("categories")} placeholder="primi, vegetariano, veloce" />
      <Field label="Immagini" hint="URL separati da virgola" value={form.image_urls} onChange={set("image_urls")} placeholder="https://…jpg, https://…png" />
      <Field label="Video" hint="URL separati da virgola" value={form.video_urls} onChange={set("video_urls")} placeholder="https://youtube.com/…" />
      <Field label="Note" hint="facoltative" value={form.notes} onChange={set("notes")} multiline rows={3} />
    </div>
  );
}

export function FormMessage({ tone = "error", children }) {
  const styles =
    tone === "error"
      ? "bg-tomato-tint text-ink"
      : "bg-mint-tint text-ink";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`text-[15px] font-semibold border-2 border-ink rounded-2xl px-4 py-3 ${styles}`}>
      {children}
    </p>
  );
}
