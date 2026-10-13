import { Routes, Route, useLocation } from "react-router";
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import RecipesPage from "./pages/RecipesPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import AddRecipePage from "./pages/AddRecipePage";
import EditRecipePage from "./pages/EditRecipePage";

// On phones, recipe and form pages bring their own top bar (back / close button).
const isFullScreen = (path) => /^\/recipe\/[^/]+/.test(path) || path === "/add";
const isForm = (path) => path === "/add" || path.endsWith("/edit");

export default function App() {
  const { pathname } = useLocation();
  const fullScreen = isFullScreen(pathname);
  const form = isForm(pathname);

  return (
    <div className="min-h-screen bg-white text-ink font-sans selection:bg-lemon">
      <div className={fullScreen ? "hidden md:block" : ""}>
        <Header />
      </div>
      <main className={`max-w-6xl mx-auto px-4 sm:px-6 pt-4 md:pt-10 ${form ? "pb-4 md:pb-24" : "pb-28 md:pb-24"}`}>
        <Routes>
          <Route path="/" element={<RecipesPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/recipe/:id/edit" element={<EditRecipePage />} />
          <Route path="/add" element={<AddRecipePage />} />
        </Routes>
      </main>
      {!form && <TabBar />}
    </div>
  );
}
