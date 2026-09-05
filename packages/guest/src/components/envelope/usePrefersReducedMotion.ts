import { useEffect, useState } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Пользователь просил не анимировать.
 *
 * Читают это в двух местах, и оба про одно: движение, которое идёт само, без
 * его участия. Конверт открывается сразу (InvitePage), а колода не перебирает
 * карточки и стоит на первой (CardCycle) — распечатывать и листать за человека
 * мы не будем, но посмотреть места он всё равно сможет.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_MOTION).matches);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const sync = () => setReduced(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}
