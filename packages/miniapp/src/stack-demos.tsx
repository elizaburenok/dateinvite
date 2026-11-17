import { Button } from './components/Button.js';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LibraryStack } from './components/LibraryStack.js';
import photo from './assets/places-feed/preview-first.jpg';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import './styles/stack-demos.css';

const variants = [
  { name: 'Мягкая', caption: 'Карточки плавно собираются. Надпись спокойно выезжает из-за фотографии.', back: 'translate(-5px, 16px) rotate(-1.05deg) scale(.94, .9)', front: 'rotate(-1.05deg)', bounce: 'translate(0, -2px) rotate(6.5deg)' },
  { name: 'Пружина', caption: 'Быстрое схлопывание и упругое раскрытие с лёгким отскоком.', back: 'translate(-5px, 19px) rotate(-1.05deg) scale(.94, .9)', front: 'translateY(3px) rotate(-1.05deg) scale(.97)', bounce: 'translate(0, -7px) rotate(9deg)' },
  { name: 'Веер', caption: 'Карточки разворачиваются вокруг нижнего края, затем появляется надпись.', back: 'translate(-2.5px, 7px) rotate(-1.05deg) scale(.9, .82)', front: 'rotate(-1.05deg)', bounce: 'translate(2px, -8px) rotate(12deg)' },
];
const place = { id: 'demo', name: 'Kooperative Chorny', photo_url: photo };

function Demo({ index, running, speed, revision, selected, onSelect }: {index:number;running:boolean;speed:number;revision:number;selected:boolean;onSelect():void}) {
  const root = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  useEffect(() => {
    const el = root.current!;
    const v = variants[index]!;
    const options: KeyframeAnimationOptions = { duration: 4400, iterations: Infinity, fill: 'both', easing: 'linear' };
    const timing = index === 1 ? 'cubic-bezier(.3,0,.15,1)' : 'cubic-bezier(.45,0,.2,1)';
    const back = el.querySelector('.home__library-back')!;
    const front = el.querySelector('.home__library-front')!;
    const label = el.querySelector('.home__library-stack-title')!;
    animations.current = [
      back.animate([
        { offset: 0, transform: 'rotate(5.62deg)' },
        { offset: .2, transform: 'rotate(5.62deg)', easing: timing },
        { offset: .38, transform: v.back },
        { offset: .52, transform: v.back, easing: timing },
        { offset: .72, transform: v.bounce, easing: 'ease-out' },
        { offset: .83, transform: 'rotate(5.62deg)' },
        { offset: 1, transform: 'rotate(5.62deg)' },
      ], options),
      front.animate([
        { offset: 0, transform: 'rotate(-1.05deg)' },
        { offset: .2, transform: 'rotate(-1.05deg)', easing: timing },
        { offset: .38, transform: v.front },
        { offset: .52, transform: v.front, easing: timing },
        { offset: .7, transform: index === 2 ? 'rotate(-6deg)' : index === 1 ? 'translateY(-2px) rotate(-2deg)' : 'rotate(-1.05deg)', easing: 'ease-out' },
        { offset: .83, transform: 'rotate(-1.05deg)' },
        { offset: 1, transform: 'rotate(-1.05deg)' },
      ], options),
      label.animate([
        { offset: 0, opacity: 1, transform: 'translateY(0)' },
        { offset: .2, opacity: 1, transform: 'translateY(0)', easing: 'ease-in' },
        { offset: .32, opacity: 0, transform: 'translateY(22px)' },
        { offset: .62, opacity: 0, transform: 'translateY(22px)', easing: timing },
        { offset: .77, opacity: 1, transform: index === 1 ? 'translateY(-3px)' : 'translateY(0)', easing: 'ease-out' },
        { offset: .86, opacity: 1, transform: 'translateY(0)' },
        { offset: 1, opacity: 1, transform: 'translateY(0)' },
      ], options),
    ];
    return () => animations.current.forEach(a => a.cancel());
  }, [index, revision]);
  useEffect(() => {
    animations.current.forEach(a => { a.playbackRate = speed; running ? a.play() : a.pause(); });
  }, [running, speed, revision]);
  const v = variants[index]!;
  return <article className={`motion-option ${selected ? 'motion-option--selected' : ''}`}>
    <div className="motion-stage" ref={root} data-variant={index}>
      <div className="home__library">
        <span className="home__library-copy"><span className="home__library-title">Библиотека</span><span className="home__library-subtitle">Все сохранённые места</span></span>
        <LibraryStack place={place} />
      </div>
    </div>
    <div className="motion-option__body"><h2><span>0{index + 1}</span> {v.name}</h2><p>{v.caption}</p>
      <Button className="motion-choice" aria-pressed={selected} onClick={onSelect}>{selected ? 'Выбрано ✓' : 'Выбрать этот вариант'}</Button>
    </div>
  </article>;
}
function App() {
  const [running, setRunning] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [speed, setSpeed] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  return <main className="motion-page">
    <header><div className="motion-eyebrow">INVITE · MOTION STUDY</div><h1>Как раскрывается стопка</h1><p>Три характера движения. Сравни в обычном темпе или замедли, чтобы рассмотреть детали.</p></header>
    <div className="motion-controls">
      <Button onClick={() => setRunning(!running)}>{running ? 'Пауза' : 'Воспроизвести'}</Button>
      <Button onClick={() => { setRevision(revision + 1); setRunning(true); }}>Повторить</Button>
      <label>Скорость <select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={.5}>0,5×</option><option value={1}>1×</option></select></label>
    </div>
    <section className="motion-grid" aria-label="Варианты анимации">{variants.map((v, i) => <Demo key={v.name} index={i} running={running} speed={speed} revision={revision} selected={selected === i} onSelect={() => setSelected(i)} />)}</section>
    <p className="motion-status" role="status">{selected === null ? 'Каждая демка повторяется по кругу: раскрытие → схлопывание → раскрытие.' : `Выбран вариант ${selected + 1} — «${variants[selected]!.name}». Напиши его номер в чате, и я перенесу движение на главную страницу.`}</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
