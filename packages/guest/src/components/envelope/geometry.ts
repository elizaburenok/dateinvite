/**
 * Силуэт конверта по макету (Figma «Снаружи»): гладкий прямоугольник 5:4 со
 * скруглёнными углами и X-фальцем — четыре треугольника сходятся к центру.
 * Верхний треугольник (клапан) откидывается, боковые и нижний неподвижны.
 *
 * Все панели рисуются в одной безразмерной коробке 100×80 и растягиваются на
 * одну и ту же область — тогда клапан, карман и задняя стенка совпадают
 * пиксель в пиксель без единой подгонки.
 */

export interface Point {
  x: number;
  y: number;
}

/** Ширина холста. Высоты считаются от неё, чтобы конверт оставался пропорциональным. */
export const ENV_W = 100;
/** Высота тела: 100×80 = 5:4, как во фрейме (500×400). */
export const ENV_BODY_H = 80;
/** Скругление углов: 8px при ширине 500 → 1.6 в наших координатах. */
export const ENV_R = 1.6;

/** Узел, куда сходятся фальцы. Чуть выше центра — как на макете. */
export const ENV_APEX: Point = { x: ENV_W / 2, y: 42 };
/** Кончик клапана заходит чуть ниже узла фальцев — тот самый нахлёст в центре. */
export const ENV_FLAP_TIP: Point = { x: ENV_W / 2, y: 45 };

export const ENV_VIEWBOX = `0 0 ${ENV_W} ${ENV_BODY_H}`;

// Углы коробки.
const TL: Point = { x: 0, y: 0 };
const TR: Point = { x: ENV_W, y: 0 };
const BR: Point = { x: ENV_W, y: ENV_BODY_H };
const BL: Point = { x: 0, y: ENV_BODY_H };

/**
 * Четыре доли фальца. Клапан чуть длиннее (до ENV_FLAP_TIP), остальные упираются
 * в общий узел ENV_APEX. Карман — это left + right + bottom: всё, кроме клапана,
 * поэтому под откинутым клапаном открывается устье, из которого выходят карточки.
 */
export const TRIANGLES = {
  flap: [TL, TR, ENV_FLAP_TIP],
  left: [TL, BL, ENV_APEX],
  right: [TR, BR, ENV_APEX],
  bottom: [BL, BR, ENV_APEX],
} as const;

/** Швы-блики по фальцам: диагонали от каждого угла к узлу. */
export const DIAGONALS: string[] = [
  `M ${TL.x} ${TL.y} L ${ENV_APEX.x} ${ENV_APEX.y}`,
  `M ${TR.x} ${TR.y} L ${ENV_APEX.x} ${ENV_APEX.y}`,
  `M ${BL.x} ${BL.y} L ${ENV_APEX.x} ${ENV_APEX.y}`,
  `M ${BR.x} ${BR.y} L ${ENV_APEX.x} ${ENV_APEX.y}`,
];

/** Замкнутый контур треугольника в виде `d` для <path>. */
export function triPath(points: readonly Point[]): string {
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
}
