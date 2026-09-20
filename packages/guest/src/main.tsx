import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/wallpaper.css';
import './styles/fonts.css';
import './styles/invite.css';
import './styles/note.css';
import './styles/envelope.css';
// cycle.css остаётся ради своих :root-токенов (--cycle-peek, --cycle-focus,
// --deck-gap и др.), на которые ссылаются pile/invite/envelope. Его
// раскладочные .cycle-правила теперь мертвы: колоду сменило колесо (wheel.css),
// и элемента .cycle в разметке больше нет.
import './styles/cycle.css';
import './styles/wheel.css';
// Последним из раскладочных: часть его правил гасит геометрию конверта у колеса
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
