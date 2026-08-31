import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/invite.css';
import { App } from './App.js';

const root = document.getElementById('root');
if (!root) throw new Error('нет #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
