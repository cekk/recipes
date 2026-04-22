import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import RecipesPage from "./pages/RecipesPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import AddRecipePage from "./pages/AddRecipePage";
import EditRecipePage from "./pages/EditRecipePage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
