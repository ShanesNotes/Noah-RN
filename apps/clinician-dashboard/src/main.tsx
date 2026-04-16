import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@noah-rn/ui-tokens/src/tokens.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
