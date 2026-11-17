import { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GlassButton } from './components/GlassButton.js';
import { PlaceThumb } from './components/PlaceThumb.js';
import photo from './assets/places-feed/preview-first.jpg';
import photo2 from './assets/places-feed/preview-second.png';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import './styles/picked-motion.css';
const variants = [
  ['Проявление', 'Короткое появление снизу с мягкой прозрачностью. Самый спокойный вариант.', 220],
  ['Пружина', 'Карточка быстро появляется и чуть пружинит перед остановкой.', 360],
  ['В стопку', 'Небольшой поворот, как будто новую карточку кладут поверх предыдущей.', 400],
  ['Из списка', 'Фотография перелетает из выбранной строки прямо в кнопку.', 460],
] as const;
const places = ['Kooperative Chorny','Atelier de tartelettes','Книжный на углу','Тихое место','Галерея','Пекарня'];
function App() {
  const [variant,setVariant] = useState(0);
  const [slow,setSlow] = useState(false);
  const [selection,setSelection] = useState<number[]>([]);
  const [notice,setNotice] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const changed = useRef<number|null>(null);
  const source = useRef<DOMRect|null>(null);
  const animations = useRef<Animation[]>([]);
  const previous = useRef(new Map<number,DOMRect>());
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  useLayoutEffect(()=>{
    const cards = root.current!.querySelectorAll<HTMLElement>('[data-picked]');
    const current = new Map<number,DOMRect>();
    const run = (element:Element,frames:Keyframe[],duration:number) => {
      const a=element.animate(frames,{duration:reduced?1:duration*(slow?2:1),easing:'cubic-bezier(.2,.75,.25,1)'});
      animations.current.push(a);
    };
    cards.forEach(card=>{
      const id=Number(card.dataset.picked), rect=card.getBoundingClientRect();
      current.set(id,rect);
      const inner=card.querySelector<HTMLElement>('.picked-inner')!;
      if(id===changed.current){
        const start=source.current;
        const frames:Keyframe[][]=[
          [{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],
          [{opacity:0,transform:'scale(.55)'},{opacity:1,transform:'scale(1.12)',offset:.7},{opacity:1,transform:'scale(1)'}],
          [{opacity:0,transform:'translate(18px,-20px) rotate(24deg)'},{opacity:1,transform:'translate(-2px,1px) rotate(-4deg)',offset:.8},{opacity:1,transform:'translate(0,0) rotate(0)'}],
          [{opacity:.9,transform:`translate(${start?start.x-rect.x:0}px,${start?start.y-rect.y:0}px) scale(2)`},{opacity:1,transform:'translate(0,0) scale(1)'}],
        ];
        run(inner,frames[variant]!,variants[variant]![2]);
      } else {
        const old=previous.current.get(id);
        if(old)run(inner,[{transform:`translate(${old.x-rect.x}px,${old.y-rect.y}px)`},{transform:'translate(0,0)'}],220);
      }
    });
    previous.current=current;changed.current=null;
  },[selection]);
  useLayoutEffect(()=>()=>animations.current.forEach(a=>a.cancel()),[]);
  const choose=(id:number)=>{
    animations.current.forEach(a=>a.cancel());animations.current=[];
    source.current=root.current!.querySelector(`[data-row="${id}"] .places-feed__thumbnail`)!.getBoundingClientRect();
    changed.current=selection.includes(id)?null:id;
    setSelection(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);setNotice(false);
  };
  const reset=()=>{animations.current.forEach(a=>a.cancel());animations.current=[];changed.current=null;previous.current.clear();setSelection([]);setNotice(false);};
  return <main className="picked-lab"><aside><small>INVITE · MOTION STUDY</small><h1>Места собираются<br/>в конверт</h1><p>Выбирай места в списке. Сравни появление первой карточки и добавление следующих в стопку.</p><div className="picked-options">{variants.map(([title,description,duration],i)=><button key={title} aria-pressed={variant===i} onClick={()=>{reset();setVariant(i);}}><b>0{i+1} · {title} <small>{duration} мс</small></b><span>{description}</span></button>)}</div><label className="picked-speed"><input type="checkbox" checked={slow} onChange={e=>setSlow(e.target.checked)}/> Замедлить вдвое</label><button className="picked-reset" onClick={reset}>Сбросить выбор</button><p className="picked-note">Повторное нажатие снимает выбор. В кнопке видны две последние карточки.</p></aside><div className="picked-phone" ref={root}><h2>Выберите места</h2><ul className="picked-list">{places.map((name,id)=><li key={name}><button className="places-feed__row" data-row={id} aria-pressed={selection.includes(id)} onClick={()=>choose(id)}><span className="places-feed__thumbnail"><PlaceThumb src={id%2?photo2:photo} name={name} seed={name}/></span><span className="places-feed__identity"><span className="places-feed__name">{name}</span><span className="places-feed__address">Москва, Лялин переулок, 5</span></span><span className="picked-check" aria-hidden="true">{selection.includes(id)?'✓':''}</span></button></li>)}</ul>{selection.length>0?<GlassButton className="picked-action glass-button--frost" onClick={()=>setNotice(true)}><span className="places-feed__added">{selection.length} {selection.length===1?'место':selection.length<5?'места':'мест'}</span><span className={`places-feed__picked-stack${selection.length===1?' places-feed__picked-stack--single':''}`} aria-hidden="true">{selection.slice(-2).map(id=><span className="places-feed__picked-card" data-picked={id} key={id}><span className="picked-inner"><PlaceThumb src={id%2?photo2:photo} name={places[id]!} seed={String(id)}/></span></span>)}</span><span>Далее</span></GlassButton>:<p className="picked-empty">Нажми на место — здесь появится карточка</p>}{notice&&<div className="picked-notice" role="status">Выбрано мест: {selection.length}. Это демо анимации.</div>}</div></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
