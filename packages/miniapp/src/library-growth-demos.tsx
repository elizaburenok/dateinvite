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
  ['Подъём и раскрытие', 'Плашка слегка сжимается и поднимается, затем вырастает в окно. Строки появляются короткой волной.', 680],
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
  const generation = useRef(0);
  const homeTransform = useRef('');
  const show = async () => {
    if (busy.current) return;
    const run = ++generation.current;
    busy.current = true;
    active.current.forEach(a => a.cancel()); active.current = [];
    const el = root.current!;
    const source = el.querySelector<HTMLElement>('.home .home__library')!;
    const overlay = el.querySelector<HTMLElement>('.library-demo__overlay')!;
    const panel = el.querySelector<HTMLElement>('.places-feed__window')!;
    const surface = el.querySelector<HTMLElement>('.library-demo__surface')!;
    overlay.hidden = true;
    setOpen(false); setNotice(false);
    source.style.zIndex = '6';
    const press = animate(source, [
      {transform: 'scale(1)', easing: 'cubic-bezier(.3,0,.5,1)'},
      {transform: 'scale(.965)'},
    ], 90);
    await press.finished.catch(() => {});
    if (generation.current !== run) return;
    overlay.hidden = false;
    const end = panel.getBoundingClientRect();
    const start = source.getBoundingClientRect();
    const dx = start.x + start.width / 2 - end.x - end.width / 2;
    const dy = start.y + start.height / 2 - end.y - end.height / 2;
    const initial = `translate(${dx}px, ${dy}px) scale(${start.width / end.width}, ${start.height / end.height})`;
    homeTransform.current = initial;
    const duration = variants[index]![2] - 90;
    const frames: Keyframe[] = [
      {transform: initial, offset: 0, easing: 'cubic-bezier(.3,0,.4,1)'},
      {transform: `translate(${dx * .6}px, ${dy * .66}px) scale(.94,.3)`, offset: .28, easing: 'cubic-bezier(.25,0,.2,1)'},
      {transform: 'translate(0,0) scale(1.018)', offset: .8, easing: 'ease-out'},
      {transform: 'translate(0,0) scale(1)', offset: 1},
    ];
    const growth = animate(surface, frames, duration);
    animate(source, [{opacity: 1}, {opacity: 0}], 150);
    const stack = source.querySelector('.home__library-stack');
    if (stack) animate(stack, [{opacity: 1, translate: '0 0'}, {opacity: 0, translate: '0 10px'}], 110);
    animate(overlay, [{backgroundColor: 'rgba(248,248,248,0)'}, {backgroundColor: 'rgba(248,248,248,1)'}], duration, 0);
    const list = el.querySelector<HTMLElement>('.places-feed__list')!;
    // Independent content layer: its dimensions never spring or reflow.
    animate(list, [
      {opacity: 0, transform: `translateY(${12}px) scale(.985)`, easing: 'cubic-bezier(.2,0,.2,1)'},
      {opacity: 1, transform: 'translateY(0) scale(1)'},
    ], 230, 280);
    {
      list.querySelectorAll('li').forEach((row, i) => animate(row, [
        {opacity: 0, translate: '0 6px', easing: 'ease-out'},
        {opacity: 1, translate: '0 0'},
      ], 180, 280 + Math.min(i, 5) * 22));
    }
    const controls = Array.from(el.querySelectorAll<HTMLButtonElement>('.places-feed__library-action, .places-feed__close'));
    const reveals = controls.map(control => {
      control.disabled = true;
      const a = animate(control, [{opacity: 0}, {opacity: 1}], 140, duration);
      void a.finished.then(() => { if (run === generation.current) control.disabled = false; }).catch(() => {});
      return a;
    });
    setOpen(true);
    await Promise.all([growth, ...reveals].map(a => a.finished.catch(() => {})));
    if (generation.current === run) busy.current = false;
  };
  const close = async () => {
    if (busy.current) return;
    busy.current = true;
    const run = ++generation.current;
    const el = root.current!;
    const overlay = el.querySelector<HTMLElement>('.library-demo__overlay')!;
    const surface = el.querySelector<HTMLElement>('.library-demo__surface')!;
    const source = el.querySelector<HTMLElement>('.home .home__library')!;
    const fades = Array.from(el.querySelectorAll('.places-feed__list, .places-feed__library-action, .places-feed__close, .library-demo__notice')).map(content => animate(content, [{opacity: getComputedStyle(content).opacity}, {opacity: 0}], 100));
    await Promise.all(fades.map(a => a.finished.catch(() => {})));
    if (generation.current !== run) return;
    const shrink = animate(surface, [
      {transform: 'translate(0,0) scale(1)', opacity: 1, easing: 'cubic-bezier(.4,0,.2,1)'},
      {transform: homeTransform.current, opacity: 0},
    ], 420);
    animate(overlay, [{backgroundColor: 'rgba(248,248,248,1)'}, {backgroundColor: 'rgba(248,248,248,0)'}], 420);
    animate(source, [{opacity: 0, transform: 'scale(.965)'}, {opacity: 1, transform: 'scale(1)'}], 180, 260);
    const stack = source.querySelector('.home__library-stack');
    if (stack) animate(stack, [{opacity: 0, translate: '0 10px'}, {opacity: 1, translate: '0 0'}], 160, 280);
    await shrink.finished.catch(() => {});
    if (generation.current !== run) return;
    overlay.hidden = true;
    active.current.forEach(a => a.cancel()); active.current = [];
    source.style.zIndex = '';
    setOpen(false); setNotice(false); busy.current = false;
    source.focus({preventScroll: true});
  };
  useEffect(() => {
    if (replay) { ++generation.current; busy.current = false; void show(); }
  }, [replay]);
  useEffect(() => () => { ++generation.current; active.current.forEach(a => a.cancel()); }, []);
  return <article className="library-demo">
    <header><span>0{index + 1} · {variants[index]![2]} мс</span><h2>{variants[index]![0]}</h2><p>{variants[index]![1]}</p></header>
    <div className="library-demo__phone library-demo__phone--growth" data-variant="0" ref={root} onKeyDown={e => {if (e.key === 'Escape' && open) void close();}}>
      <div inert={open}><Home latestPlace={null} onOpenLibrary={() => void show()} onCreateEnvelope={() => void show()} /></div>
      <div className="library-demo__overlay places-feed--library" hidden>
        <Button iconOnly size="small" className="places-feed__close" onClick={() => void close()} aria-label="Закрыть список"><img className="places-feed__close-cross" src={cross} alt=""/></Button>
        <div className="places-feed__window">
          <div className="home__library library-demo__surface" aria-hidden="true" />
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
  return <main className="library-demos"><header><span>INVITE · MOTION STUDY</span><h1>Из Library — в список</h1><p>Выбранный вариант: нажатие → подъём и рост окна → появление списка.</p></header><div className="library-demos__controls"><Button onClick={() => setReplay(x => x + 1)}>Повторить анимацию</Button><label>Скорость <select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="0.5">0,5×</option></select></label></div><p className="library-demos__previous"><a href="./library-demos.html">Предыдущие варианты</a></p><section className="library-demos__grid">{variants.map((v, i) => <Demo key={v[0]} index={i} speed={speed} replay={replay}/>)}</section></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
