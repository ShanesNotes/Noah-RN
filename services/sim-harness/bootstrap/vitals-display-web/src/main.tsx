import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root mount');
createRoot(root).render(<App />);
