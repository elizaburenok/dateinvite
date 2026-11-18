import { useLayoutEffect, useRef, type RefObject } from 'react';

function growLibrarySheet(dialog: HTMLDivElement, panel: HTMLElement, onClose: () => void) {
  const source = document.querySelector<HTMLElement>('.home__saved-places');
  if (!source) return null;
  const compact = panel.querySelector<HTMLElement>('.places-feed__motion-compact');
  const content = Array.from(panel.children).filter(child => child !== compact) as HTMLElement[];
  const closeButton = dialog.querySelector<HTMLButtonElement>('.places-feed__close');
  const rows = Array.from(panel.querySelectorAll<HTMLElement>('.places-feed__list li'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = (ms: number) => reduced ? 1 : ms;
  const animations: Animation[] = [];
  const originalStyle = panel.style.cssText;
  const originalVisibility = source.style.visibility;
  let disposed = false;
  let closing = false;

  const box = (rect: DOMRect) => ({
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
  });
  const setBox = (rect: DOMRect) => {
    Object.assign(panel.style, box(rect));
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
  };
  const animate = (element: Element, frames: Keyframe[], ms: number, delay = 0) => {
    const animation = element.animate(frames, {
      duration: duration(ms), delay: reduced ? 0 : delay,
      easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'both',
    });
    animations.push(animation);
    return animation;
  };
  const finishAll = (items: Animation[]) => Promise.all(items.map(item => item.finished.catch(() => {})));
  const start = source.getBoundingClientRect();
  const end = panel.getBoundingClientRect();
  setBox(start);
  source.style.visibility = 'hidden';
  panel.inert = true;
  if (closeButton) closeButton.disabled = true;
  const shape = animate(panel, [
    { ...box(start), borderRadius: '24px', offset: 0, easing: 'cubic-bezier(.3,0,.2,1)' },
    { ...box(new DOMRect(end.left, end.top - 8, end.width, end.height + 8)), borderRadius: '30px 30px 0 0', offset: .83, easing: 'cubic-bezier(.18,0,.45,1)' },
    { ...box(end), borderRadius: '24px 24px 0 0', offset: 1 },
  ], 1300);
  const opening = [
    shape,
    animate(dialog, [{ opacity: 0 }, { opacity: 1 }], 1040),
    ...(compact ? [animate(compact, [{ opacity: 1 }, { opacity: 0 }], 320, 240)] : []),
    ...content.map(element => animate(element,
      [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 620, 580)),
    ...rows.map((row, index) => animate(row,
      [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], 580, 700 + Math.min(index, 4) * 84)),
    ...(closeButton ? [animate(closeButton,
      [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], 520, 740)] : []),
  ];
  void finishAll(opening).then(() => {
    if (disposed || closing) return;
    animations.forEach(animation => animation.cancel());
    panel.style.cssText = originalStyle;
    panel.inert = false;
    if (closeButton) closeButton.disabled = false;
    dialog.classList.add('places-feed--motion-open');
  });

  const close = () => {
    if (closing || disposed) return;
    closing = true;
    const current = panel.getBoundingClientRect();
    const currentDialogOpacity = getComputedStyle(dialog).opacity;
    const currentCompactOpacity = compact ? getComputedStyle(compact).opacity : '0';
    const currentContent = content.map(element => getComputedStyle(element).opacity);
    const currentCloseOpacity = closeButton ? getComputedStyle(closeButton).opacity : '0';
    setBox(current);
    animations.forEach(animation => animation.cancel());
    animations.length = 0;
    panel.inert = true;
    if (closeButton) closeButton.disabled = true;
    const fades = [
      ...content.map((element, index) => animate(element,
        [{ opacity: currentContent[index] }, { opacity: 0 }], 260)),
      ...(closeButton ? [animate(closeButton,
        [{ opacity: currentCloseOpacity }, { opacity: 0 }], 260)] : []),
    ];
    void finishAll(fades).then(() => {
      if (disposed) return;
      const target = source.getBoundingClientRect();
      const morph = animate(panel, [
        { ...box(current), borderRadius: '24px 24px 0 0' },
        { ...box(target), borderRadius: '24px' },
      ], 860);
      const rest = [
        animate(dialog, [{ opacity: currentDialogOpacity }, { opacity: 0 }], 860),
        ...(compact ? [animate(compact,
          [{ opacity: currentCompactOpacity }, { opacity: 1 }], 300, 400)] : []),
      ];
      void finishAll([morph, ...rest]).then(() => { if (!disposed) onClose(); });
    });
  };
  const cleanup = () => {
    disposed = true;
    animations.forEach(animation => animation.cancel());
    panel.style.cssText = originalStyle;
    panel.inert = false;
    source.style.visibility = originalVisibility;
    if (closeButton) closeButton.disabled = false;
  };
  return { close, cleanup };
}

/** Grow the library from its home card; keep the create flow's existing motion. */
export function useLibrarySheetMotion(dialogRef: RefObject<HTMLDivElement | null>, enabled: boolean, onClose: () => void, openingDuration = 240) {
  const closeRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!enabled) return;
    const dialog = dialogRef.current;
    const panel = dialog?.querySelector<HTMLElement>('.places-feed__window');
    if (!dialog || !panel) return;
    if (dialog.classList.contains('places-feed--library')) {
      const motion = growLibrarySheet(dialog, panel, () => onCloseRef.current());
      if (motion) {
        closeRef.current = motion.close;
        return () => { motion.cleanup(); closeRef.current = null; };
      }
    }
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
