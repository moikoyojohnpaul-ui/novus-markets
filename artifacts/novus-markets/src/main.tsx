import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

// The generated API client already embeds /api in every path,
// so no setBaseUrl call is needed — all routes resolve correctly.

createRoot(document.getElementById('root')!).render(<App />);
