import { useEffect, type RefObject } from 'react';

/** Smooth mouse-wheel input while leaving touch, keyboard and reduced motion native. */
export function useSmoothWheelScroll(ref: RefObject<HTMLElement | null>, enabled = true, refresh?: unknown) {
  useEffect(() => {
    const list = ref.current;
    if (!list || !enabled) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = list.scrollTop;
    let position = target;
    let frame = 0;
    let previousTime = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      target = list.scrollTop;
      position = target;
    };
    const tick = (time: number) => {
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;
      target = Math.max(0, Math.min(target, list.scrollHeight - list.clientHeight));
      const remaining = target - position;
      if (Math.abs(remaining) < .5) {
        list.scrollTop = target;
        frame = 0;
        return;
      }
      position += remaining * (1 - Math.exp(-elapsed / 70));
      list.scrollTop = position;
      frame = requestAnimationFrame(tick);
    };
    const onWheel = (event: WheelEvent) => {
      if (preference.matches || event.ctrlKey || event.shiftKey || !event.cancelable ||
          Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        stop();
        return;
      }
      const max = list.scrollHeight - list.clientHeight;
      if (max <= 0 || event.deltaY === 0) return;
      const unit = event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? list.clientHeight : 1;
      const delta = event.deltaY * unit;
      event.preventDefault();
      if (!frame || Math.sign(delta) !== Math.sign(target - position)) {
        position = list.scrollTop;
        target = position;
      }
      target = Math.max(0, Math.min(max, target + delta));
      if (!frame) {
        previousTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    list.addEventListener('wheel', onWheel, { passive: false });
    list.addEventListener('pointerdown', stop, { passive: true });
    list.addEventListener('touchstart', stop, { passive: true });
    list.addEventListener('keydown', stop);
    preference.addEventListener('change', stop);
    return () => {
      list.removeEventListener('wheel', onWheel);
      list.removeEventListener('pointerdown', stop);
      list.removeEventListener('touchstart', stop);
      list.removeEventListener('keydown', stop);
      preference.removeEventListener('change', stop);
      stop();
    };
  }, [ref, enabled, refresh]);
}
