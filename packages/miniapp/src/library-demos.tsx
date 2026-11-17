import { Button } from './components/Button.js';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './screens/Home.js';
import { GlassButton } from './components/GlassButton.js';
import { PlaceThumb } from './components/PlaceThumb.js';
import photo from './assets/places-feed/preview-first.jpg';
import photo2 from './assets/places-feed/preview-second.png';
import plus from './assets/places-feed/library-plus.svg';
import cross from './assets/places-feed/library-close-cross.svg';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import './styles/library-demos.css';

const variants = [
  ['Мягкое раскрытие', 'Плавное раскрытие с мягкой пружиной. Кнопки появляются после окна.', 560],
  ['Из плашки в окно', 'Плашка поднимается и расширяется, сохраняя свою поверхность.', 520],
  ['С преддвижением', 'Короткое сжатие при нажатии, затем раскрытие из центра.', 460],
] as const;
const names = ['Kooperative Chorny', 'Atelier de tartelettes', 'Kafe na Khlebozavode', 'Тихое место', 'Coffee Room', 'Галерея', 'Пекарня', 'Книжный'];

function Demo({ index, speed, replay }: {index: number; speed: number; replay: number}) {
  const root = useRef<HTMLDivElement>(null);
  const active = useRef<Animation[]>([]);
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = (el: Element, frames: Keyframe[], duration: number, delay = 0) => {
    const a = el.animate(frames, { duration: reduced ? 1 : duration / speed, delay: reduced ? 0 : delay / speed, fill: 'both' });
    active.current.push(a);
    return a;
  };
  const show = async () => {
    if (busy.current) return;
    busy.current = true;
    active.current.forEach(a => a.cancel()); active.current = [];
    const el = root.current!;
    const source = el.querySelector('.home__library')!;
    const overlay = el.querySelector<HTMLElement>('.library-demo__overlay')!;
    const panel = el.querySelector<HTMLElement>('.places-feed__window')!;
    setNotice(false);
    if (index === 2) {
      await animate(source, [{transform: 'scale(1)'}, {transform: 'scale(.97)', easing: 'ease-in'}], 80).finished.catch(() => {});
    }
    overlay.hidden = false;
    const end = panel.getBoundingClientRect();
    const start = source.getBoundingClientRect();
    const x = index === 1 ? start.x - end.x : (end.width - 72) / 2;
    const y = index === 1 ? start.y - end.y : (end.height - 72) / 2;
    const width = index === 1 ? start.width : 72;
    const height = index === 1 ? start.height : 72;
    const duration = variants[index]![2] - (index === 2 ? 80 : 0);
    // Animate the surface bounds. Text and photos keep their natural dimensions.
    const bounds = (scale: number) => ({
      width: `${end.width * scale}px`, height: `${end.height * scale}px`,
      translate: `${end.width * (1 - scale) / 2}px ${end.height * (1 - scale) / 2}px`, opacity: 1,
    });
    const surface = index === 0 ? el.querySelector('.library-demo__surface')! : panel;
    const animation = animate(surface, index === 0 ? [
      {width: `${width}px`, height: `${height}px`, translate: `${x}px ${y}px`, opacity: 0, offset: 0, easing: 'cubic-bezier(.32,0,.22,1)'},
      {...bounds(1.018), offset: .72, easing: 'cubic-bezier(.4,0,.2,1)'},
      {...bounds(1), offset: 1},
    ] : [
      {width: `${width}px`, height: `${height}px`, translate: `${x}px ${y}px`, opacity: index === 1 ? 1 : .25, offset: 0, easing: 'cubic-bezier(.45,0,.18,1)'},
      {...bounds(1.012), offset: .78, easing: 'ease-out'},
      {...bounds(1), offset: 1},
    ], duration);
    animate(overlay, [{backgroundColor: 'rgba(248,248,248,0)'}, {backgroundColor: 'rgba(248,248,248,1)'}], duration * .8);
    // Bring the stationary rows in as the panel approaches full size.
    animate(el.querySelector('.places-feed__list')!, index === 0 ? [
      {opacity: 0, easing: 'cubic-bezier(.2,0,.2,1)'},
      {opacity: 1},
    ] : [
      {opacity: 0, transform: 'translateY(8px)', easing: 'ease-out'},
      {opacity: 1, transform: 'translateY(0)'},
    ], index === 0 ? 210 : 150, index === 0 ? duration * .38 : duration * .65);
    for (const control of el.querySelectorAll<HTMLButtonElement>('.places-feed__library-action, .places-feed__close')) {
      control.disabled = true;
      const reveal = animate(control, [
        {opacity: 0, easing: 'ease-out'}, {opacity: 1},
      ], index === 0 ? 180 : 150, index === 0 ? duration : duration * .65);
      void reveal.finished.then(() => { control.disabled = false; }).catch(() => {});
    }
    setOpen(true);
    await animation.finished.catch(() => {});
    busy.current = false;
  };
  const close = async () => {
    if (busy.current) return;
    busy.current = true;
    const el = root.current!;
    const panel = el.querySelector('.places-feed__window')!;
    if (index === 0) {
      const overlay = el.querySelector<HTMLElement>('.library-demo__overlay')!;
      const end = panel.getBoundingClientRect();
      const fades = Array.from(el.querySelectorAll<HTMLElement>(
        '.places-feed__list, .places-feed__library-action, .places-feed__close, .library-demo__notice',
      )).map(content => animate(content, [
        {opacity: getComputedStyle(content).opacity, easing: 'ease-out'}, {opacity: 0},
      ], 120));
      await Promise.all(fades.map(a => a.finished.catch(() => {})));
      // Reverse the surface geometry while the content is hidden and stationary.
      // Fade the last small shape all the way to zero before removing the overlay.
      const collapse = animate(el.querySelector('.library-demo__surface')!, [
        {width: `${end.width}px`, height: `${end.height}px`, translate: '0px 0px',
          opacity: 1, offset: 0, easing: 'cubic-bezier(.4,0,.3,1)'},
        {width: '72px', height: '72px',
          translate: `${(end.width - 72) / 2}px ${(end.height - 72) / 2}px`,
          opacity: .2, offset: .85, easing: 'ease-out'},
        {width: '48px', height: '48px',
          translate: `${(end.width - 48) / 2}px ${(end.height - 48) / 2}px`,
          opacity: 0, offset: 1},
      ], 400);
      const backdrop = animate(overlay, [
        {backgroundColor: 'rgba(248,248,248,1)', easing: 'ease-in-out'},
        {backgroundColor: 'rgba(248,248,248,0)'},
      ], 400);
      await Promise.all([collapse.finished, backdrop.finished].map(p => p.catch(() => {})));
    } else {
      const a = animate(panel, [{opacity: 1, scale: '1'}, {opacity: 0, scale: '.7', easing: 'ease-in'}], 240);
      await a.finished.catch(() => {});
    }
    active.current.forEach(a => a.cancel()); active.current = [];
    el.querySelector<HTMLElement>('.library-demo__overlay')!.hidden = true;
    setOpen(false); setNotice(false); busy.current = false;
    el.querySelector<HTMLButtonElement>('.home__library')!.focus({preventScroll: true});
  };
  useEffect(() => { if (replay) { busy.current = false; void show(); } }, [replay]);
  useEffect(() => () => active.current.forEach(a => a.cancel()), []);
  return <article className="library-demo">
    <header><span>0{index + 1} · {variants[index]![2]} мс</span><h2>{variants[index]![0]}</h2><p>{variants[index]![1]}</p></header>
    <div className="library-demo__phone" data-variant={index} ref={root} onKeyDown={e => {if (e.key === 'Escape' && open) void close();}}>
      <div inert={open}><Home latestPlace={null} onOpenLibrary={() => void show()} onCreateEnvelope={() => void show()} /></div>
      <div className="library-demo__overlay places-feed--library" hidden>
        <Button iconOnly size="small" className="places-feed__close" onClick={() => void close()} aria-label="Закрыть список"><img className="places-feed__close-cross" src={cross} alt=""/></Button>
        <div className="places-feed__window">
          {index === 0 && <div className="home__library library-demo__surface" aria-hidden="true" />}
          <ul className="places-feed__list">{names.map((name, i) => <li key={name}><div className="places-feed__row"><span className="places-feed__thumbnail"><PlaceThumb src={i % 2 ? photo2 : photo} name={name} seed={name}/></span><span className="places-feed__identity"><span className="places-feed__name">{name}</span><span className="places-feed__address">Москва, Лялин переулок, 5</span></span></div></li>)}</ul>
          <GlassButton className="places-feed__library-action" onClick={() => setNotice(!notice)} aria-label="Добавить место"><img src={plus} width="24" height="24" alt=""/><span>Добавить</span></GlassButton>
          {notice && <div className="library-demo__notice" role="status">Здесь откроется форма нового места</div>}
        </div>
      </div>
    </div>
    <Button className="library-demo__repeat" onClick={() => void (open ? close() : show())}>{open ? 'Закрыть' : 'Открыть Library'}</Button>
  </article>;
}
function App() {
  const [speed, setSpeed] = useState(1);
  const [replay, setReplay] = useState(0);
  return <main className="library-demos"><header><span>INVITE · MOTION STUDY</span><h1>Library раскрывается</h1><p>Нажми на плашку в каждом экране. Сравни разгон, раскрытие и лёгкую пружину.</p></header><div className="library-demos__controls"><Button onClick={() => setReplay(x => x + 1)}>Сравнить все одновременно</Button><label>Скорость <select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="0.5">0,5×</option></select></label></div><section className="library-demos__grid">{variants.map((v, i) => <Demo key={v[0]} index={i} speed={speed} replay={replay}/>)}</section></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
