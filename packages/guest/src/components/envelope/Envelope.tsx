import { useMemo } from 'react';
import { EnvelopePanel } from './EnvelopeSkin.js';
import { playEnvelopeOpen } from './sound.js';
import { useReveal, type RevealChain, type RevealState } from './useReveal.js';
import stampUrl from '../../assets/stamp.png';

/**
 * Состояния раскрытия общие у конверта и у кучки мини-превью — они живут в
 * useReveal.ts, где заодно объяснено, почему имена одни на два входа. Здесь
 * оставлено привычное имя: колода и страница знают тип под ним.
 */
export type EnvelopeState = RevealState;

/**
 * Тайминги дублируют токены `--dur-unseal` / `--dur-flap` / `--dur-deal`.
 * Почему дублирование осознанное — разобрано в useReveal.ts.
 */
export const TIMING = { unseal: 280, flap: 720, deal: 640, stagger: 60 } as const;

export function useEnvelopeOpening(autoOpen: boolean, cardCount: number) {
  const chain = useMemo<RevealChain>(
    () => ({
      unsealing: ['opening', TIMING.unseal],
      opening: ['dealing', TIMING.flap],
      // Последняя карточка стартует позже всех — ждём и её.
      dealing: ['open', TIMING.deal + TIMING.stagger * Math.max(0, cardCount - 1)],
    }),
    [cardCount],
  );

  // Шуршание бумаги — на срыве печати: у конверта есть чему шуршать.
  return useReveal(chain, autoOpen, playEnvelopeOpen);
}

interface EnvelopeProps {
  state: EnvelopeState;
  onOpen(): void;
}

export function Envelope({ state, onOpen }: EnvelopeProps) {
  const sealed = state === 'sealed';

  /*
   * Конверт разрезан на два слоя, между которыми лежит стопка карточек, — иначе
   * «внутри конверта» получиться не может. Карточки обязаны быть впереди задней
   * стенки (её видно в устье над ними) и позади кармана с клапаном (те их
   * закрывают). Одним элементом это не выражается: соседняя колода встанет либо
   * целиком за конвертом, либо целиком перед ним. Порядок задают z-index'ы в
   * envelope.css, а не порядок в разметке.
   */
  return (
    <>
      <div className="envelope envelope--back" data-state={state} aria-hidden="true">
        <div className="envelope__stage">
          <div className="envelope__panel envelope__back">
            <EnvelopePanel shape="back" />
          </div>
        </div>
      </div>

      <div className="envelope envelope--front" data-state={state}>
        <div className="envelope__stage">
          {/* Клапан вращается вокруг верхней кромки, а не своего центра, — и
              разъезжается с телом при малейшей ошибке. Изнанку показываем тенью.
              Он в переднем слое: закрытым обязан прятать карточки в устье, а
              откинутым уходит выше кромки, где закрывать уже нечего. */}
          <div className="envelope__flap">
            <div className="envelope__panel">
              <EnvelopePanel shape="flap" />
            </div>
          </div>

          <div className="envelope__panel envelope__pocket">
            <EnvelopePanel shape="pocket" />
          </div>

          {/* Кликабелен весь конверт, а не только печать: попасть в сургуч
              пальцем на телефоне — задача не для гостя. */}
          <button type="button" className="envelope__latch" onClick={onOpen} disabled={!sealed}>
            <span className="envelope__seal">
              <img className="envelope__stamp" src={stampUrl} alt="" aria-hidden="true" />
            </span>
            <span className="visually-hidden">Открыть конверт</span>
          </button>
        </div>
      </div>
    </>
  );
}
