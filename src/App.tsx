import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DomainPage from "./pages/DomainPage";
import BinuiPage from "./pages/BinuiPage";
import BinuiProjectDetail from "./pages/BinuiProjectDetail";
import PituaPage from "./pages/PituaPage";
import PituaDetail from "./pages/PituaDetail";
import MeyadimPage from "./pages/MeyadimPage";
import MeyadimDetail from "./pages/MeyadimDetail";
import PeulotPage from "./pages/PeulotPage";
import PeulotDetail from "./pages/PeulotDetail";
import AppsPage from "./pages/AppsPage";
import AppsDetail from "./pages/AppsDetail";
import AgentsPage from "./pages/AgentsPage";
import AgentsDetail from "./pages/AgentsDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/binui" element={<BinuiPage />} />
          <Route path="/binui/:id" element={<BinuiProjectDetail />} />
          <Route path="/pitua" element={<PituaPage />} />
          <Route path="/pitua/:id" element={<PituaDetail />} />
          <Route path="/meyadim" element={<MeyadimPage />} />
          <Route path="/meyadim/:id" element={<MeyadimDetail />} />
          <Route path="/peulot" element={<PeulotPage />} />
          <Route path="/peulot/:id" element={<PeulotDetail />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/apps/:id" element={<AppsDetail />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/:id" element={<AgentsDetail />} />
          <Route path="/:slug" element={<DomainPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
