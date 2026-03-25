import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

// Expose Supabase client to window for debugging purposes in development
if (import.meta.env.MODE === 'development') {
  // @ts-ignore - Intentionally exposing for debugging
  window.supabase = supabase;
  console.log('Supabase client exposed to window.supabase for debugging');
}

createRoot(document.getElementById("root")!).render(<App />);
