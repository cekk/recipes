import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import RecipesPage from "./pages/RecipesPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import AddRecipePage from "./pages/AddRecipePage";
import EditRecipePage from "./pages/EditRecipePage";

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<RecipesPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/recipe/:id/edit" element={<EditRecipePage />} />
          <Route path="/add" element={<AddRecipePage />} />
        </Routes>
      </main>
    </div>
  );
}
