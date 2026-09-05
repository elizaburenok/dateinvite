import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import '@invite/shared/styles/theme-dark.css';
import './styles/app.css';
import { App } from './App.js';
import { bootstrap } from './telegram.js';

bootstrap();

const root = document.getElementById('root');
if (!root) throw new Error('нет #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
