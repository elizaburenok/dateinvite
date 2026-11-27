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
      <div><h1>Цвет в движении</h1><p aria-live="polite">{original ? 'Исходный фон из Figma' : paused ? 'Анимация на паузе' : 'Жёлто-зелёная волна · цикл 16 секунд'}</p></div>
      <div className="pastel-demo__buttons">
        <button onClick={() => setPaused(value => !value)} aria-pressed={paused} disabled={original}>{paused ? 'Продолжить' : 'Пауза'}</button>
        <button onClick={() => setOriginal(value => !value)} aria-pressed={original}>{original ? 'Показать анимацию' : 'Сравнить с оригиналом'}</button>
      </div>
    </section>
  </main>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<Demo />);
// Dispose the previous root and its animation loop when this demo entry updates.
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
