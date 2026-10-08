import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Home from "./pages/Home";

// Route-level code splitting: keep the landing page in the main bundle
// (it's the most common entry) and lazy-load the rest.
// Stale chunks (after a redeploy or an old cached bundle) make dynamic imports
// fail with "Failed to fetch dynamically imported module" and a blank screen.
// Retry once, then reload the page to pick up the current bundle.
const lazyPage = (importer: () => Promise<{ default: React.ComponentType<any> }>) =>
  lazy(() =>
    importer().catch(async (err) => {
      await new Promise((r) => setTimeout(r, 600));
      try {
        return await importer();
      } catch {
        const key = "chunk-reload-at";
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
        }
        throw err;
      }
    })
  );

const Index = lazyPage(() => import("./pages/Index"));
const BookPage = lazyPage(() => import("./pages/BookPage"));
const BookReader = lazyPage(() => import("./pages/BookReader"));
const BookRecipe = lazyPage(() => import("./pages/BookRecipe"));
const Library = lazyPage(() => import("./pages/Library"));
const RecipePage = lazyPage(() => import("./pages/RecipePage"));
const Admin = lazyPage(() => import("./pages/Admin"));
const Auth = lazyPage(() => import("./pages/Auth"));
const Premium = lazyPage(() => import("./pages/Premium"));
const Favorites = lazyPage(() => import("./pages/Favorites"));
const TermsOfService = lazyPage(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazyPage(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazyPage(() => import("./pages/RefundPolicy"));
const Contact = lazyPage(() => import("./pages/Contact"));
const ForCreators = lazyPage(() => import("./pages/ForCreators"));
const CreatorBeta = lazyPage(() => import("./pages/CreatorBeta"));
const CreatorDashboard = lazyPage(() => import("./pages/CreatorDashboard"));
const NotFound = lazyPage(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="rm-theme">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recipes" element={<Index />} />
            <Route path="/library" element={<Library />} />
            <Route path="/book/:slug" element={<BookReader />} />
            <Route path="/book/:slug/:recipeId" element={<BookRecipe />} />
            <Route path="/recipe/:id" element={<RecipePage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refund" element={<RefundPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/for-creators" element={<ForCreators />} />
            <Route path="/c/:slug" element={<BookPage />} />
            <Route path="/creator-beta" element={<CreatorBeta />} />
            <Route path="/creator" element={<CreatorDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
