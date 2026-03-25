import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define environment variables for the client
    define: {
      // Make process.env available to the client
      'process.env': {
        VITE_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL || "https://nodxpgdulvnuvpbwkgzz.supabase.co"),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZHhwZ2R1bHZudXZwYndrZ3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMzIzNzAsImV4cCI6MjA2MzYwODM3MH0.T13s1F097F79HysTduG2bWj6SZ4Nw7-F0N9oKbL6K7w")
      }
    }
  };
});
