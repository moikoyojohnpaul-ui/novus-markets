import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setBaseUrl } from '@workspace/api-client-react';
import App from './App';
import './index.css';

// This is the root fix for "No markets available".
// VITE_API_URL is baked in at Vercel build time.
// The fallback string catches any case where the env var is missing.
const apiUrl =
  import.meta.env.VITE_API_URL ||
  'https://novus-markets-3.onrender.com'; // ← your Render URL here

setBaseUrl(apiUrl);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);