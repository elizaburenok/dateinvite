import { useCallback, useEffect, useRef, useState } from 'react';
import pinkCardUrl from '../assets/invitation-pink-card.png';
import { usePrefersReducedMotion } from './envelope/usePrefersReducedMotion.js';

interface InvitationIntroProps {
  onReveal(): void;
  onFinish(): void;
}

/** The small inline card becomes the full-screen surface before revealing places. */
export function InvitationIntro({ onReveal, onFinish }: InvitationIntroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const cardRef = useRef<HTMLSpanElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const opening = useRef(false);
  const origin = useRef({ x: 0, y: 0, width: 94, height: 64, angle: 6.57 });
  const [phase, setPhase] = useState<'idle' | 'expanding' | 'revealing'>('idle');

  const open = useCallback(() => {
    if (opening.current || !cardRef.current) return;
    opening.current = true;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
    origin.current = {
      x: rect.left + rect.width / 2 - card.offsetWidth / 2,
      y: rect.top + rect.height / 2 - card.offsetHeight / 2,
      width: card.offsetWidth,
      height: card.offsetHeight,
      angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
    };
    setPhase('expanding');
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let wheelDistance = 0;
    let lastWheel = 0;
    let touchStart: { x: number; y: number } | null = null;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 180) wheelDistance = 0;
      lastWheel = now;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      wheelDistance = Math.max(0, wheelDistance + event.deltaY * unit);
      if (wheelDistance >= 18) open();
    };
    const touch = (event: TouchEvent) => {
      const point = event.touches[0];
      touchStart = event.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : null;
    };
    const move = (event: TouchEvent) => {
      const point = event.touches[0];
      if (!point || !touchStart || event.touches.length !== 1) return;
      const dy = touchStart.y - point.clientY;
      if (dy > 24 && dy > Math.abs(touchStart.x - point.clientX)) {
        event.preventDefault();
        open();
      }
    };
    const key = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('touchstart', touch, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('touchstart', touch);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  useEffect(() => {
    if (phase !== 'expanding' || !surfaceRef.current) return;
    if (reducedMotion) {
      onReveal();
      onFinish();
      return;
    }
    const surface = surfaceRef.current;
    const from = origin.current;
    let cancelled = false;
    const expansion = surface.animate([
      { left: `${from.x}px`, top: `${from.y}px`, width: `${from.width}px`, height: `${from.height}px`, transform: `rotate(${from.angle}deg)`, borderRadius: '5.312px' },
      { left: '0px', top: '0px', width: '100vw', height: '100dvh', transform: 'rotate(0deg)', borderRadius: '0px' },
    ], { duration: 1050, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' });
    void expansion.finished.then(() => {
      if (cancelled) return;
      onReveal();
      setPhase('revealing');
    }).catch(() => { /* Unmount cancels the animation. */ });
    return () => {
      cancelled = true;
      expansion.cancel();
    };
  }, [phase, reducedMotion, onReveal, onFinish]);

  useEffect(() => {
    if (phase !== 'revealing') return;
    const timer = window.setTimeout(onFinish, reducedMotion ? 0 : 420);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, onFinish]);

  return (
    <section className="invitation-intro" data-phase={phase} aria-label="Your invitation">
      <h1 className="invitation-intro__headline">
        <span className="invitation-intro__line">I’ve gathered some</span>
        <span className="invitation-intro__line invitation-intro__line--card">
          <span>places</span>
          <span ref={cardRef} className="invitation-intro__card" aria-hidden="true">
            <img src={pinkCardUrl} alt="" draggable={false} />
          </span>
          <span>for you</span>
        </span>
      </h1>
      <p className="invitation-intro__hint">
        <span>Scroll to explore</span><span className="invitation-intro__arrow" aria-hidden="true">↓</span>
      </p>
      {phase !== 'idle' && (
        <div ref={surfaceRef} className="invitation-intro__surface" aria-hidden="true">
          <img src={pinkCardUrl} alt="" />
        </div>
      )}
    </section>
  );
}
