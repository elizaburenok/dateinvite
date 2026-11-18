import { useLayoutEffect, useRef, type RefObject } from 'react';

function showPlacesSheet(dialog: HTMLDivElement, panel: HTMLElement, onClose: () => void) {
  const content = Array.from(panel.children) as HTMLElement[];
  const closeButton = dialog.querySelector<HTMLButtonElement>('.places-feed__close');
  const rows = Array.from(panel.querySelectorAll<HTMLElement>('.places-feed__list li'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = (ms: number) => reduced ? 1 : ms;
  const animations: Animation[] = [];
  let disposed = false;
  let closing = false;

  const animate = (element: Element, frames: Keyframe[], ms: number, delay = 0) => {
    const animation = element.animate(frames, {
      duration: duration(ms), delay: reduced ? 0 : delay,
      easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'both',
    });
    animations.push(animation);
    return animation;
  };
  const finishAll = (items: Animation[]) => Promise.all(items.map(item => item.finished.catch(() => {})));
  panel.inert = true;
  if (closeButton) closeButton.disabled = true;
  const surface = animate(panel, [
    { opacity: 0, transform: 'translate(-50%, 18px) scale(.985)' },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1)' },
  ], 420);
  const opening = [
    surface,
    animate(dialog, [{ opacity: 0 }, { opacity: 1 }], 420),
    ...content.map(element => animate(element,
      [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 620, 180)),
    ...rows.map((row, index) => animate(row,
      [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], 580, 320 + Math.min(index, 4) * 84)),
    ...(closeButton ? [animate(closeButton,
      [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], 320, 180)] : []),
  ];
  void surface.finished.then(() => {
    if (disposed || closing) return;
    panel.inert = false;
    if (closeButton) closeButton.disabled = false;
  }).catch(() => {});
  void finishAll(opening).then(() => {
    if (disposed || closing) return;
    animations.forEach(animation => animation.cancel());
    dialog.classList.add('places-feed--motion-open');
  });

  const close = () => {
    if (closing || disposed) return;
    closing = true;
    const closingContent = Array.from(panel.children) as HTMLElement[];
    const closingRows = Array.from(panel.querySelectorAll<HTMLElement>('.places-feed__list li'));
    const panelStyle = getComputedStyle(panel);
    const currentPanelOpacity = panelStyle.opacity;
    const currentPanelTransform = panelStyle.transform;
    const currentDialogOpacity = getComputedStyle(dialog).opacity;
    const currentContent = closingContent.map(element => ({
      opacity: getComputedStyle(element).opacity,
      transform: getComputedStyle(element).transform,
    }));
    const currentCloseOpacity = closeButton ? getComputedStyle(closeButton).opacity : '0';
    const list = panel.querySelector<HTMLElement>('.places-feed__list');
    const listRect = list?.getBoundingClientRect();
    const visibleRows = listRect ? closingRows.filter(row => {
      const rect = row.getBoundingClientRect();
      return rect.bottom > listRect.top && rect.top < listRect.bottom;
    }) : [];
    const currentRows = visibleRows.map(row => ({
      opacity: getComputedStyle(row).opacity,
      transform: getComputedStyle(row).transform,
    }));
    const panelDelay = Math.max(260, Math.min(visibleRows.length - 1, 8) * 42 + 80);
    panel.style.opacity = currentPanelOpacity;
    panel.style.transform = currentPanelTransform;
    animations.forEach(animation => animation.cancel());
    animations.length = 0;
    panel.inert = true;
    if (closeButton) closeButton.disabled = true;
    const fades = [
      ...visibleRows.map((row, index) => animate(row,
        [{ opacity: currentRows[index]!.opacity, transform: currentRows[index]!.transform },
          { opacity: 0, transform: 'translateY(14px)' }], 220, Math.min(visibleRows.length - 1 - index, 8) * 42)),
      ...closingContent.map((element, index) => animate(element,
        [{ opacity: currentContent[index]!.opacity, transform: currentContent[index]!.transform },
          { opacity: 0, transform: 'translateY(18px)' }], 260,
        element.classList.contains('places-feed__list') ? panelDelay - 100 : 120)),
      ...(closeButton ? [animate(closeButton,
        [{ opacity: currentCloseOpacity }, { opacity: 0 }], 160)] : []),
      animate(panel,
        [{ opacity: currentPanelOpacity, transform: currentPanelTransform },
          { opacity: 0, transform: 'translate(-50%, 12px) scale(.985)' }], 240, panelDelay),
      animate(dialog, [{ opacity: currentDialogOpacity }, { opacity: 0 }], 240, panelDelay),
    ];
    void finishAll(fades).then(() => { if (!disposed) onClose(); });
  };
  const cleanup = () => {
    disposed = true;
    animations.forEach(animation => animation.cancel());
    panel.inert = false;
    if (closeButton) closeButton.disabled = false;
  };
  return { close, cleanup };
}

/** Both place-list entry points share the same in-place entrance and exit. */
export function usePlacesSheetMotion(dialogRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const closeRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const panel = dialog?.querySelector<HTMLElement>('.places-feed__window');
    if (!dialog || !panel) return;
    const motion = showPlacesSheet(dialog, panel, () => onCloseRef.current());
    closeRef.current = motion.close;
    return () => { motion.cleanup(); closeRef.current = null; };
  }, [dialogRef]);

  return () => closeRef.current ? closeRef.current() : onCloseRef.current();
}
