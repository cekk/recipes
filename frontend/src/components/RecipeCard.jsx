import { Link } from "react-router-dom";

const DIFFICULTY_COLORS = {
  facile: "bg-green-100 text-green-800",
  medio: "bg-amber-100 text-amber-800",
  difficile: "bg-red-100 text-red-800",
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
      className="block bg-white rounded-xl shadow-sm border border-stone-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {recipe.image_urls && recipe.image_urls.length > 0 ? (
        <div 
          className="bg-stone-200 bg-cover bg-center h-32" 
          style={{ backgroundImage: `url(${recipe.image_urls[0]})` }}
        />
      ) : (
        <div className="bg-gradient-to-br from-amber-400 to-amber-600 h-2" />
      )}
      <div className="p-4">
        <h2 className="font-semibold text-lg leading-snug mb-1 line-clamp-2">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="text-stone-500 text-sm line-clamp-2 mb-3">
            {recipe.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {recipe.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full"
            >
              {cat}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-500">
          {totalTime > 0 && <span>⏱️ {formatTime(totalTime)}</span>}
          {recipe.servings && <span>👤 {recipe.servings} porz.</span>}
          {recipe.difficulty && (
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${
                DIFFICULTY_COLORS[recipe.difficulty] ||
                "bg-stone-100 text-stone-600"
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
