import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './screens/Home.js';
import { PlaceThumb } from './components/PlaceThumb.js';
import { LibrarySheetHeading } from './components/LibrarySheetHeading.js';
import firstPhoto from './assets/places-feed/preview-first.jpg';
import secondPhoto from './assets/places-feed/preview-second.png';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import './styles/recollect-sheet-demo.css';

const places = [
  ['Bambinu', '2 Manezhnyy Lane, Saint Petersburg', firstPhoto],
  ['B Side', 'Admiralteyskogo kanala 2M Embankment', secondPhoto],
  ["L’Aube", '4 Malaya Zelenina Street, Saint Petersburg', firstPhoto],
  ['Svidanie', '50 Lermontovskiy Avenue, Saint Petersburg', secondPhoto],
  ['Blackchops', 'reki Fontanki Embankment, Saint Petersburg', firstPhoto],
  ['Ro na nab', '44 reki Moyki Embankment, Saint Petersburg', secondPhoto],
] as const;

function Demo() {
  const phoneRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const animations = useRef<Animation[]>([]);
  const [open, setOpen] = useState(false);
  const [slow, setSlow] = useState(false);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animate = (element: Element, frames: Keyframe[], duration: number, delay = 0) => {
    const animation = element.animate(frames, {
      duration: reduced ? 1 : duration * (slow ? 2 : 1),
      delay: reduced ? 0 : delay * (slow ? 2 : 1),
      fill: 'both',
      easing: 'cubic-bezier(.22,.7,.2,1)',
    });
    animations.current.push(animation);
    return animation;
  };

  const elements = () => {
    const phone = phoneRef.current!;
    return {
      phone,
      source: phone.querySelector<HTMLButtonElement>('.home__saved-places')!,
      overlay: phone.querySelector<HTMLElement>('.recollect-demo__overlay')!,
      panel: phone.querySelector<HTMLElement>('.recollect-demo__panel')!,
      compact: phone.querySelector<HTMLElement>('.recollect-demo__compact')!,
      content: phone.querySelector<HTMLElement>('.recollect-demo__content')!,
      close: phone.querySelector<HTMLButtonElement>('.recollect-demo__close')!,
    };
  };

  const geometry = () => {
    const { phone, source } = elements();
    const frame = phone.getBoundingClientRect();
    const start = source.getBoundingClientRect();
    return {
      start: { left: start.left - frame.left, top: start.top - frame.top, width: start.width, height: start.height },
      end: { left: 8, top: 82, width: frame.width - 16, height: frame.height - 96 },
    };
  };

  const values = (box: { left: number; top: number; width: number; height: number }, radius: string) => ({
    left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, borderRadius: radius,
  });

  const show = async () => {
    if (busy.current || open) return;
    busy.current = true;
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    const { source, overlay, panel, compact, content, close } = elements();
    const { start, end } = geometry();
    Object.assign(panel.style, values(start, '24px'));
    compact.style.opacity = '1';
    content.style.opacity = '0';
    close.style.opacity = '0';
    overlay.hidden = false;
    source.style.visibility = 'hidden';
    setOpen(true);

    const shape = animate(panel, [
      { ...values(start, '24px'), offset: 0, easing: 'cubic-bezier(.3,0,.2,1)' },
      { ...values({ ...end, top: end.top - 4, height: end.height + 4 }, '30px 30px 0 0'), offset: .83, easing: 'cubic-bezier(.18,0,.45,1)' },
      { ...values(end, '28px 28px 0 0'), offset: 1 },
    ], 650);
    const reveals = [
      animate(overlay, [{ backgroundColor: 'rgba(247,247,247,0)', backdropFilter: 'blur(0px)' },
        { backgroundColor: 'rgba(247,247,247,.72)', backdropFilter: 'blur(12px)' }], 520),
      animate(compact, [{ opacity: 1 }, { opacity: 0 }], 160, 120),
      animate(content, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 310, 290),
      animate(close, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], 260, 370),
      ...Array.from(content.querySelectorAll('.places-feed__list li')).map((row, index) =>
        animate(row, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], 290, 350 + index * 42)),
    ];
    await Promise.all([shape, ...reveals].map(animation => animation.finished.catch(() => {})));
    Object.assign(panel.style, values(end, '28px 28px 0 0'));
    compact.style.opacity = '0';
    content.style.opacity = '1';
    close.style.opacity = '1';
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    close.focus({ preventScroll: true });
    busy.current = false;
  };

  const hide = async () => {
    if (busy.current || !open) return;
    busy.current = true;
    const { source, overlay, panel, compact, content, close } = elements();
    const { start, end } = geometry();
    const fades = [
      animate(content, [{ opacity: 1 }, { opacity: 0 }], 130),
      animate(close, [{ opacity: 1 }, { opacity: 0 }], 130),
    ];
    await Promise.all(fades.map(animation => animation.finished.catch(() => {})));
    const morph = animate(panel, [values(end, '28px 28px 0 0'), values(start, '24px')], 430);
    const rest = [
      animate(compact, [{ opacity: 0 }, { opacity: 1 }], 150, 200),
      animate(overlay, [{ backgroundColor: 'rgba(247,247,247,.72)', backdropFilter: 'blur(12px)' },
        { backgroundColor: 'rgba(247,247,247,0)', backdropFilter: 'blur(0px)' }], 430),
    ];
    await Promise.all([morph, ...rest].map(animation => animation.finished.catch(() => {})));
    overlay.hidden = true;
    source.style.visibility = '';
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    setOpen(false);
    source.focus({ preventScroll: true });
    busy.current = false;
  };

  useEffect(() => () => animations.current.forEach(animation => animation.cancel()), []);

  return <main className="recollect-demo">
    <section className="recollect-demo__notes">
      <span className="recollect-demo__eyebrow">INVITE · MOTION STUDY</span>
      <h1>Список мест из нижней панели</h1>
      <p>Нажмите «My places»: компактная панель вырастет в окно, фон мягко размоется, затем появятся строки списка.</p>
      <p>Это отдельное демо. Появление в приложении пока не менялось.</p>
      <label className="recollect-demo__speed"><input type="checkbox" checked={slow} disabled={open} onChange={event => setSlow(event.target.checked)} /> Замедлить вдвое</label>
      <button className="recollect-demo__replay" onClick={() => void (open ? hide() : show())}>{open ? 'Закрыть' : 'Показать анимацию'}</button>
    </section>
    <div className="recollect-demo__phone" ref={phoneRef} onKeyDown={event => { if (event.key === 'Escape' && open) void hide(); }}>
      <div inert={open}><Home latestPlace={null} onOpenLibrary={() => void show()} onCreateEnvelope={() => void show()} /></div>
      <div className="recollect-demo__overlay" hidden role="dialog" aria-modal="true" aria-label="Saved places">
        <button className="recollect-demo__close" type="button" onClick={() => void hide()} aria-label="Закрыть список">×</button>
        <div className="recollect-demo__panel">
          <div className="recollect-demo__compact">My places</div>
          <div className="recollect-demo__content places-feed--library">
            <LibrarySheetHeading />
            <div className="places-feed__tags"><span className="recollect-demo__tag">Tag <span aria-hidden="true">⌄</span></span></div>
            <ul className="places-feed__list" aria-label="Сохранённые места">
              {places.map(([name, address, photo]) => <li key={name}>
                <div className="places-feed__row">
                  <span className="places-feed__thumbnail"><PlaceThumb src={photo} name={name} seed={name} /></span>
                  <span className="places-feed__identity"><span className="places-feed__name">{name}</span><span className="places-feed__address">{address}</span></span>
                </div>
              </li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Demo />);
