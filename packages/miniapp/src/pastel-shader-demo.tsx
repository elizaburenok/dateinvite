import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import { PastelBackground } from './components/PastelBackground.js';
import './styles/pastel-shader-demo.css';

function Demo() {
  const [paused, setPaused] = useState(false);
  const [original, setOriginal] = useState(false);
  return <main className="pastel-demo">
    <PastelBackground paused={paused} original={original} />
    <section className="pastel-demo__controls" aria-label="Управление фоном">
      <div><h1>Цвет в движении</h1><p>{original ? 'Исходный фон из Figma' : 'Мягкое движение · цикл 30 секунд'}</p></div>
      <div className="pastel-demo__buttons">
        <button onClick={() => setPaused(value => !value)} aria-pressed={paused} disabled={original}>{paused ? 'Продолжить' : 'Пауза'}</button>
        <button onClick={() => setOriginal(value => !value)} aria-pressed={original}>{original ? 'Показать анимацию' : 'Сравнить с оригиналом'}</button>
      </div>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
