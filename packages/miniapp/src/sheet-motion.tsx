import { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import './styles/sheet-motion.css';
import photo from './assets/places-feed/preview-first.jpg';
import second from './assets/places-feed/preview-second.png';
const variants = [
  ['Мягкая пружина', 'Шторка поднимается снизу и мягко возвращается после небольшого перелёта. Знакомое, живое движение.'],
  ['Из карточки · мягко', 'Короткое проявление в полном размере с едва заметным смещением. Поверхность и текст появляются вместе, без миниатюры.'],
  ['Веер', 'Шторка слегка поворачивается при входе, а места появляются по очереди, как карточки в стопке.'],
  ['Занавес', 'Поверхность раскрывается снизу вверх, затем проявляется список. Спокойнее пружины, но выразительнее обычного появления.'],
];
function App() {
  const [variant, setVariant] = useState(1);
  const [slow, setSlow] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = useRef<Animation[]>([]);
  const locked = useRef(false);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = (el: Element, frames: Keyframe[], duration: number, delay = 0, easing = 'cubic-bezier(.22,.7,.2,1)') => {
    const a = el.animate(frames, {duration: reduced ? 1 : duration * (slow ? 2 : 1), delay: reduced ? 0 : delay * (slow ? 2 : 1), fill: 'both', easing});
    active.current.push(a); return a;
  };
  const play = async (closing = false) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    const el = root.current!;
    const overlay = el.querySelector<HTMLElement>('.motion-overlay')!;
    const panel = el.querySelector<HTMLElement>('.motion-panel')!;
    const content = el.querySelector<HTMLElement>('.motion-content')!;
    const source = el.querySelector<HTMLButtonElement>('.motion-source')!;
    const rest = 'inset(0% 0% 0% 0% round 24px)';
    if (!closing) {active.current.forEach(a => a.cancel()); active.current = []; overlay.hidden = false; setOpen(true);}
    if (closing) {
      if (variant !== 1) await animate(content, [{opacity: 1}, {opacity: 0}], 90).finished.catch(() => {});
      const a = animate(panel, variant === 1 ? [{transform: 'translateY(0)', opacity: 1}, {transform: 'translateY(10px)', opacity: 0}] : [{transform: 'translateY(0) rotate(0deg)', opacity: 1}, {transform: `translateY(${variant === 0 ? '100%' : '50px'}) rotate(${variant === 2 ? '3deg' : '0deg'})`, opacity: 0}], variant === 1 ? 180 : 320);
      animate(overlay, [{backgroundColor: 'rgba(247,247,247,.96)'}, {backgroundColor: 'rgba(247,247,247,0)'}], variant === 1 ? 180 : 320);
      await a.finished.catch(() => {});
      overlay.hidden = true; setOpen(false); active.current.forEach(a => a.cancel()); active.current = []; source.focus();
    } else {
      const frames: Keyframe[][] = [
        [{transform:'translateY(105%)'}, {transform:'translateY(-8px)', offset:.78}, {transform:'translateY(0)'}],
        [{transform:'translateY(14px)',opacity:0}, {transform:'translateY(0)',opacity:1}],
        [{transform:'translateY(90px) rotate(7deg)',opacity:0}, {transform:'translateY(-3px) rotate(-.6deg)',opacity:1,offset:.8}, {transform:'translateY(0) rotate(0deg)',opacity:1}],
        [{clipPath:'inset(100% 0 0 0 round 24px)'}, {clipPath:rest}],
      ];
      if (variant !== 1) animate(source,[{scale:'1'},{scale:'.96',offset:.35},{scale:'1'}],220);
      animate(overlay,[{backgroundColor:'rgba(247,247,247,0)'},{backgroundColor:'rgba(247,247,247,.96)'}],variant === 1 ? 240 : 480);
      panel.style.transformOrigin = variant === 1 ? 'top left' : 'bottom left';
      const a = animate(panel, frames[variant]!, variant === 1 ? 240 : 560, 0, variant === 1 ? 'cubic-bezier(.3,0,.65,1)' : 'cubic-bezier(.22,.7,.2,1)');
      if (variant !== 1) animate(content,[{opacity:0},{opacity:1}],200,220);
      if (variant === 2) content.querySelectorAll('li').forEach((row,i)=>animate(row,[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],240,240+i*35));
      await a.finished.catch(() => {});
      el.querySelector<HTMLButtonElement>('.motion-close')?.focus({preventScroll:true});
    }
    locked.current = false; setBusy(false);
  };
  useEffect(()=>()=>active.current.forEach(a=>a.cancel()),[]);
  return <main className="motion-lab"><aside><span>INVITE · MOTION STUDY</span><h1>Как открываются<br/>«Мои места»</h1><p>Выбери вариант и нажми на карточку. Закрыть можно крестиком, клавишей Escape или потянув за верхнюю ручку вниз.</p><div className="motion-options">{variants.map(([title,description],i)=><button disabled={open || busy} aria-pressed={variant===i} key={title} onClick={()=>setVariant(i)}><b>0{i+1} · {title}</b><span>{description}</span></button>)}</div><label className="motion-speed"><input type="checkbox" checked={slow} disabled={busy} onChange={e=>setSlow(e.target.checked)}/> Замедлить вдвое</label><button className="motion-replay" disabled={busy} onClick={()=>void play(open)}>{busy ? 'Анимация…' : open ? 'Закрыть шторку' : 'Посмотреть вариант'}</button></aside><div className="motion-phone" ref={root} onKeyDown={e=>{if(e.key==='Escape' && open) void play(true);}}><div className="motion-home" inert={open}><h2>fromout</h2><div className="motion-photo" style={{backgroundImage:`url(${photo})`}}><button className="motion-source" onClick={()=>void play()}><img src={photo} alt=""/><span>Мои места</span></button><div className="motion-envelope">Собрать конверт</div></div></div><div className="motion-overlay" hidden><button className="motion-close" disabled={busy} aria-label="Закрыть список" onClick={()=>void play(true)}>×</button><section className="motion-panel" role="dialog" aria-modal="true" aria-label="Мои места"><div className="motion-content"><button className="motion-grip" aria-label="Закрыть шторку" onClick={()=>void play(true)} onPointerDown={e=>{e.currentTarget.dataset.start=String(e.clientY);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(e.clientY-Number(e.currentTarget.dataset.start)>35)void play(true);}}><span/></button><h3>Сохранённые места</h3><ul>{['Kooperative Chorny','Atelier de tartelettes','Книжный на углу','Тихое место','Галерея','Пекарня'].map((name,i)=><li key={name}><img src={i%2?second:photo} alt=""/><div><b>{name}</b><span>Москва, Лялин переулок, 5</span></div></li>)}</ul></div></section></div></div></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
