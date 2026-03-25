import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import VisualizerPage from "./pages/VisualizerPage";
import PlaygroundPage from "./pages/PlaygroundPage";
import ProblemsPage from "./pages/ProblemsPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AuthPage from "./pages/AuthPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { useEffect } from "react";
import { supabase } from "./integrations/supabase/client";

// Load auth testing utility in development mode
if (import.meta.env.DEV) {
  import('./utils/auth-test.js')
    .then(() => console.log('Auth testing utilities loaded'))
    .catch(err => console.error('Failed to load auth testing utilities:', err));
}

const queryClient = new QueryClient();

// Animation wrapper component
const AnimationWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
      {children}
    </div>
  );
};

// Session validator with enhanced error handling
const SessionValidator = () => {
  useEffect(() => {
    const validateSession = async () => {
      console.log("Validating session on app start...");
      try {
        // Check if we have a session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session retrieval error:", error.message);
          // Clean up any invalid session data
          await supabase.auth.signOut().catch(e => console.error("Error during cleanup signout:", e));
        } else if (data?.session) {
          console.log("Valid session found for:", data.session.user.email);
          
          // Verify if user has a profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') { // Not Found error
            console.error("Error checking for user profile:", profileError);
          } else if (!profileData) {
            console.log("No profile found for user, creating one");
            // Create profile for user if missing
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{
                id: data.session.user.id,
                email: data.session.user.email,
                full_name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
              
            if (insertError) {
              console.error("Failed to create profile:", insertError);
            } else {
              console.log("Profile created successfully");
            }
          }
        } else {
          console.log("No active session");
        }
      } catch (err) {
        console.error("Session validation error:", err);
      }
    };

    validateSession();
    
    // Set up auth state listener to detect changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.email || "no user");
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
};

// Routes with animations
const AnimatedRoutes = () => {
  const location = useLocation();
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Layout><AnimationWrapper><HomePage /></AnimationWrapper></Layout>} />
      <Route path="/visualizer" element={<Layout><AnimationWrapper><VisualizerPage /></AnimationWrapper></Layout>} />
      <Route path="/playground" element={<Layout><AnimationWrapper><PlaygroundPage /></AnimationWrapper></Layout>} />
      <Route path="/problems" element={<Layout><AnimationWrapper><ProblemsPage /></AnimationWrapper></Layout>} />
      <Route path="/about" element={<Layout><AnimationWrapper><AboutPage /></AnimationWrapper></Layout>} />
      <Route path="/contact" element={<Layout><AnimationWrapper><ContactPage /></AnimationWrapper></Layout>} />
      <Route path="/auth" element={<AnimationWrapper><AuthPage /></AnimationWrapper>} />
      <Route path="/messages" element={<Layout><AnimationWrapper><MessagesPage /></AnimationWrapper></Layout>} />
      <Route path="/profile" element={<Layout><AnimationWrapper><ProfilePage /></AnimationWrapper></Layout>} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<Layout><AnimationWrapper><NotFound /></AnimationWrapper></Layout>} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SessionValidator />
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
