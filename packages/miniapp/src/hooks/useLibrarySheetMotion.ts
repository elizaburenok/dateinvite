import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Keep the sheet's layout fixed throughout opening and closing. */
export function useLibrarySheetMotion(dialogRef: RefObject<HTMLDivElement | null>, enabled: boolean, onClose: () => void, openingDuration = 240) {
  const closeRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!enabled) return;
    const dialog = dialogRef.current;
    const panel = dialog?.querySelector<HTMLElement>('.places-feed__window');
    if (!dialog || !panel) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations: Animation[] = [];
    let disposed = false;
    let closing = false;
    const animate = (element: Element, frames: Keyframe[], duration: number, easing = 'cubic-bezier(.3,0,.65,1)') => {
      const animation = element.animate(frames, {
        duration: reduced ? 1 : duration, easing, fill: 'both',
      });
      animations.push(animation);
      return animation;
    };
    const settleDuration = 100;
    const settleStart = openingDuration / (openingDuration + settleDuration);
    const settlePeak = settleStart + (1 - settleStart) * .4;
    const opening = animate(panel, [
      { offset: 0, opacity: 0, transform: 'translate(-50%, 14px)', easing: 'cubic-bezier(.32,.08,.72,.78)' },
      { offset: settleStart, opacity: 1, transform: 'translate(-50%, 0)', easing: 'cubic-bezier(.33,0,.67,1)' },
      { offset: settlePeak, opacity: 1, transform: 'translate(-50%, -3px)', easing: 'cubic-bezier(.22,0,.32,1)' },
      { offset: 1, opacity: 1, transform: 'translate(-50%, 0)' },
    ], openingDuration + settleDuration);
    const backdropOpening = animate(dialog, [{ opacity: 0 }, { opacity: 1 }], openingDuration, 'cubic-bezier(.32,.08,.72,.78)');
    void backdropOpening.finished.then(() => {
      if (!disposed && !closing) dialog.classList.add('places-feed--motion-open');
    }).catch(() => {});
    void opening.finished.then(() => {
      if (disposed || closing) return;
      opening.cancel();
      backdropOpening.cancel();
    }).catch(() => {});

    closeRef.current = () => {
      if (closing) return;
      closing = true;
      const style = getComputedStyle(panel);
      const panelOpacity = style.opacity;
      const panelTransform = style.transform;
      const dialogOpacity = getComputedStyle(dialog).opacity;
      opening.cancel();
      backdropOpening.cancel();
      const collapse = animate(panel, [
        { opacity: panelOpacity, transform: panelTransform },
        { opacity: 0, transform: 'translate(-50%, 10px)' },
      ], 100);
      animate(dialog, [{ opacity: dialogOpacity }, { opacity: 0 }], 100);
      void collapse.finished.then(() => { if (!disposed) onCloseRef.current(); }).catch(() => {});
    };
    return () => {
      disposed = true;
      animations.forEach(animation => animation.cancel());
      closeRef.current = null;
    };
  }, [dialogRef, enabled, openingDuration]);

  return () => closeRef.current ? closeRef.current() : onCloseRef.current();
}
