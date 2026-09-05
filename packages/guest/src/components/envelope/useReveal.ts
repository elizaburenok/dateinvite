import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Раскрытие приглашения. Состояния идут строго по порядку и каждое отвечает за
 * свой кусок движения — так анимации не наезжают друг на друга и можно в любой
 * момент сказать, где мы находимся.
 *
 * Имена общие у обоих входов — у конверта и у кучки, — хотя движения за ними
 * разные. Это не экономия на типах: по этим же именам живёт колода
 * (CardCycle считает `dealt` как `dealing` или `open`), и знать, чем именно её
 * достали — конвертом или кучкой, — ей незачем.
 */
export type RevealState = 'sealed' | 'unsealing' | 'opening' | 'dealing' | 'open';

/**
 * Таблица переходов: из какого состояния в какое и через сколько миллисекунд.
 * Частичная намеренно — вход пропускает чужие такты (у кучки нет клапана,
 * значит нет и `opening`), а отсутствие записи означает конец цепочки.
 *
 * Числа дублируют токены длительностей в CSS. Дублирование осознанное: CSS
 * двигает пиксели, а JS переключает состояния, и синхронизировать их можно либо
 * этими числами, либо ловлей transitionend на каждом слое — второе хрупче.
 *
 * Совпадать один в один они при этом не обязаны, и у кучки не совпадают: там
 * число здесь — момент, в который трогается следующий такт, а переход в CSS
 * длиннее и доигрывает поверх него (PILE_TIMING.lead против --dur-fog в
 * pile.css). Так и делается нахлёст: переход не обрывается сменой состояния,
 * пока новое правило не меняет его конечное значение.
 */
export type RevealChain = Partial<Record<RevealState, [RevealState, number]>>;

/**
 * Шагатель по цепочке. Держит текущее состояние и один таймер на такт.
 *
 * `chain` обязан быть стабильным между рендерами (useMemo у вызывающего):
 * он стоит в зависимостях эффекта, и новый объект на каждый рендер перезаводил
 * бы таймер такта заново — раскрытие зависало бы на первом шаге.
 *
 * `autoOpen` — «показывать нечего, покажи сразу конец»: истёкшее приглашение,
 * уже отвеченное, просьба не анимировать интерфейс или просто неактивный вход.
 */
export function useReveal(chain: RevealChain, autoOpen: boolean, onStart?: () => void) {
  const [state, setState] = useState<RevealState>(autoOpen ? 'open' : 'sealed');

  // Побочный эффект старта (у конверта это звук) пускаем ровно один раз и ровно
  // из обработчика клика: клик — тот самый жест пользователя, по которому
  // браузер и разрешает аудио. Флаг держит его от повтора: сам updater setState
  // в StrictMode вызывается дважды, поэтому эффект живёт вне него.
  const startedRef = useRef(false);
  const startRef = useRef(onStart);
  startRef.current = onStart;

  const open = useCallback(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      startRef.current?.();
    }
    setState((current) => (current === 'sealed' ? 'unsealing' : current));
  }, []);

  useEffect(() => {
    if (autoOpen) {
      setState('open');
      return;
    }
    const step = chain[state];
    if (!step) return;

    const [target, delay] = step;
    const timer = window.setTimeout(() => setState(target), delay);
    return () => window.clearTimeout(timer);
  }, [state, autoOpen, chain]);

  return { state, open };
}
