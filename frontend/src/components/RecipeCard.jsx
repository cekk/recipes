import { Link } from "react-router-dom";

const DIFFICULTY_COLORS = {
  facile: "bg-emerald-100 text-emerald-800",
  medio: "bg-indigo-100 text-indigo-800",
  difficile: "bg-rose-100 text-rose-800",
};

function formatTime(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function RecipeCard({ recipe }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 overflow-hidden ring-1 ring-slate-200 hover:-translate-y-1"
    >
      {recipe.image_urls && recipe.image_urls.length > 0 ? (
        <div 
          className="bg-slate-100 bg-cover bg-center h-48 group-hover:scale-105 transition-transform duration-500" 
          style={{ backgroundImage: `url(${recipe.image_urls[0]})` }}
        />
      ) : (
        <div className="bg-gradient-to-br from-indigo-400 to-purple-600 h-32 opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      <div className="p-5 flex flex-col h-full bg-white relative z-10">
        <h2 className="font-bold text-xl leading-tight mb-2 text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="text-slate-500 text-sm line-clamp-2 mb-4">
            {recipe.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {cat}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex gap-4">
            {totalTime > 0 && <span className="flex items-center gap-1">⏱️ {formatTime(totalTime)}</span>}
            {recipe.servings && <span className="flex items-center gap-1">👤 {recipe.servings}</span>}
          </div>
          {recipe.difficulty && (
            <span
              className={`px-2.5 py-1 rounded-full ${
                DIFFICULTY_COLORS[recipe.difficulty] ||
                "bg-slate-100 text-slate-600"
              }`}
            >
              {recipe.difficulty}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
