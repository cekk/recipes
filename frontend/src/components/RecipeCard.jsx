import { Link } from "react-router";
import { formatTime, categoryTone } from "../format";
import { ClockIcon, PlateIllustration } from "./Icons";

export function CategoryPill({ category, solid = true, className = "" }) {
  const tone = categoryTone(category);
  return (
    <span
      className={`inline-flex border-[1.5px] border-ink rounded-full px-2.5 py-0.5 text-[11px] md:text-xs font-extrabold uppercase tracking-wide ${
        solid ? tone.solid : "bg-cream"
      } ${className}`}
    >
      {category}
    </span>
  );
}

export default function RecipeCard({ recipe }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const image = recipe.image_urls?.[0];
  const category = recipe.categories?.[0];
  const time = totalTime > 0 ? formatTime(totalTime) : null;
  const shortMeta = [time, recipe.difficulty].filter(Boolean).join(" · ");
  const fullMeta = [time, recipe.servings && `${recipe.servings} pers.`, recipe.difficulty].filter(Boolean).join(" · ");

  return (
    <Link to={`/recipe/${recipe.id}`} className="group flex flex-col gap-2 md:gap-2.5 text-ink">
      <div
        className={`relative aspect-square rounded-[18px] md:rounded-[20px] border-2 border-ink overflow-hidden flex items-center justify-center transition-[translate,box-shadow] duration-150 group-hover:-translate-x-[3px] group-hover:-translate-y-[3px] group-hover:shadow-hard-lg ${
          image ? "bg-cream" : categoryTone(category).tint
        }`}
      >
        {image ? (
          <img src={image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-ink">
            <PlateIllustration size={96} />
          </span>
        )}
        {category && <CategoryPill category={category} className="absolute top-2 left-2 md:top-2.5 md:left-2.5" />}
      </div>
      <h3 className="font-extrabold text-[15px] md:text-lg leading-tight line-clamp-2">{recipe.title}</h3>
      {fullMeta && (
        <p className="flex items-center gap-1.5 text-[13px] md:text-sm font-medium text-muted">
          <ClockIcon size={14} strokeWidth={2.2} className="shrink-0" />
          <span className="md:hidden">{shortMeta}</span>
          <span className="hidden md:inline">{fullMeta}</span>
        </p>
      )}
    </Link>
  );
}
