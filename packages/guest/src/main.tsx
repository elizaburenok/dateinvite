import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/wallpaper.css';
import './styles/fonts.css';
import './styles/invite.css';
import './styles/envelope.css';
import './styles/cycle.css';
// Последним из раскладочных: часть его правил гасит геометрию конверта у колоды
// тем же весом селектора, и разводит их порядок подключения (см. шапку файла).
import './styles/pile.css';
import { App } from './App.js';

const root = document.getElementById('root');
if (!root) throw new Error('нет #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
