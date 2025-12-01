import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Signup from "./pages/auth/Signup";
import Login from "./pages/auth/Login";
import TailorDashboard from "./pages/tailor/Dashboard";
import CustomerExplore from "./pages/customer/Explore";
import ProfileEdit from "./pages/tailor/ProfileEdit";
import Portfolio from "./pages/tailor/Portfolio";
import TailorOrders from "./pages/tailor/Orders";
import CustomerOrders from "./pages/customer/Orders";
import PublicProfile from "./pages/tailor/PublicProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/tailor/dashboard" element={<TailorDashboard />} />
          <Route path="/tailor/profile-edit" element={<ProfileEdit />} />
          <Route path="/tailor/portfolio" element={<Portfolio />} />
          <Route path="/tailor/orders" element={<TailorOrders />} />
          <Route path="/tailor/:slug" element={<PublicProfile />} />
          <Route path="/customer/explore" element={<CustomerExplore />} />
          <Route path="/customer/orders" element={<CustomerOrders />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
