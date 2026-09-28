import { useCallback, useState } from 'react';
import type { AnimationEvent } from 'react';

/**
 * Закрытие листа-карточки (.sheet) с exit-анимацией. React иначе размонтирует
 * лист мгновенно — уходить некому. Поэтому close-кнопка не зовёт onClose сразу,
 * а помечает лист классом .sheet--closing (карточка сжимается, поля гаснут), и
 * настоящий onClose срабатывает по концу анимации sheet-out.
 *
 * При prefers-reduced-motion анимации нет — закрываем сразу, без «зависшего» листа.
 */
export function useSheetClose(onClose: () => void) {
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onClose();
      return;
    }
    setClosing(true);
  }, [onClose]);

  const onAnimationEnd = useCallback(
    (event: AnimationEvent) => {
      // animationend всплывает и от дочерних узлов — ловим только уход самого листа.
      if (closing && event.animationName === 'sheet-out') onClose();
    },
    [closing, onClose],
  );

  return { closing, requestClose, onAnimationEnd };
}
