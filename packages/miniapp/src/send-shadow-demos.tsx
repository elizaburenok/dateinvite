import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import './styles/button.css';
import './styles/envelope-preview.css';
import './styles/send-shadow-demos.css';
import { GlassButton } from './components/GlassButton.js';

const variants = [
  { id: 'soft', title: 'Мягкая', text: 'Лёгкая нейтральная тень без широкого ореола.' },
  { id: 'contact', title: 'Компактная', text: 'Короткая тень непосредственно под кнопкой.' },
  { id: 'light', title: 'Светлая', text: 'Белое свечение без серого затемнения.' },
  { id: 'none', title: 'Без тени', text: 'Только фон и тонкая обводка кнопки.' },
];

createRoot(document.getElementById('root')!).render(<main className="send-shadow-demo">
  <h1>Тень кнопки отправки</h1>
  <p>Одинаковые фон, размер и обводка. Отличается только тень.</p>
  <div className="send-shadow-demo__grid">{variants.map(variant => <article key={variant.id}>
    <h2>{variant.title}</h2><p>{variant.text}</p>
    <div className="envelope-preview send-shadow-demo__scene" data-send-shadow={variant.id}>
      <footer className="envelope-preview__footer">
        <h3 className="envelope-preview__title">Your envelope is ready<br />to be sent</h3>
        <GlassButton className="envelope-preview__action glass-button--frost">Send envelope</GlassButton>
      </footer>
    </div>
    <a href={`./?sendShadow=${variant.id}`}>Посмотреть в приложении</a>
  </article>)}</div>
  <p>Это сравнение оформления: кнопки здесь не отправляют конверт.</p>
</main>);
