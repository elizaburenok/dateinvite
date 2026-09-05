import { useId } from 'react';
import {
  DIAGONALS,
  ENV_BODY_H,
  ENV_R,
  ENV_VIEWBOX,
  ENV_W,
  TRIANGLES,
  triPath,
} from './geometry.js';

/**
 * Полотно конверта по макету. Ни одной растровой картинки: конверт должен
 * одинаково выглядеть и на ретине, и в тёмной теме, и при любой ширине. Цвета
 * приходят токенами — см. tokens.css и селекторы .env-* в envelope.css.
 */

export type PanelShape = 'back' | 'pocket' | 'flap';

interface PanelProps {
  shape: PanelShape;
}

export function EnvelopePanel({ shape }: PanelProps) {
  const uid = useId().replace(/:/g, '');
  const clipId = `${uid}-clip`;

  return (
    <svg className="env-panel" viewBox={ENV_VIEWBOX} aria-hidden="true" focusable="false">
      <defs>
        {/* Углы всех долей режутся по общему скруглённому прямоугольнику. */}
        <clipPath id={clipId}>
          <rect x="0" y="0" width={ENV_W} height={ENV_BODY_H} rx={ENV_R} />
        </clipPath>
      </defs>

      {/* Задняя стенка — сплошное поле в размер конверта, её видно в устье. */}
      {shape === 'back' && (
        <rect className="env-face" x="0" y="0" width={ENV_W} height={ENV_BODY_H} rx={ENV_R} />
      )}

      {/* Карман: дно + боковые фальцы. Верхний треугольник не закрашен вовсе —
          это устье, и сквозь него видно карточки, лежащие внутри конверта.
          Сплошного прямоугольника под фальцами тут быть не может: он закрывал бы
          устье наглухо, и «внутри» было бы нарисованным, а не настоящим. */}
      {shape === 'pocket' && (
        <g clipPath={`url(#${clipId})`}>
          <path className="env-face" d={triPath(TRIANGLES.bottom)} />
          <path className="env-fold" d={triPath(TRIANGLES.left)} />
          <path className="env-fold" d={triPath(TRIANGLES.right)} />
          {DIAGONALS.map((d) => (
            <path key={d} className="env-stitch" d={d} />
          ))}
          <rect
            className="env-edge"
            x="0"
            y="0"
            width={ENV_W}
            height={ENV_BODY_H}
            rx={ENV_R}
            fill="none"
          />
        </g>
      )}

      {/* Клапан — верхний треугольник, он один вращается вокруг верхней кромки. */}
      {shape === 'flap' && (
        <g clipPath={`url(#${clipId})`}>
          <path className="env-flap-face" d={triPath(TRIANGLES.flap)} />
        </g>
      )}
    </svg>
  );
}
