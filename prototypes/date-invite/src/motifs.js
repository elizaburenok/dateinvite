/**
 * Крестиковые мотивы — SVG из квадратных «стежков».
 * Рисуем по сетке 11×11: каждый стежок = один крестик размером 1×1.
 */

const CELL = 4;

/** Карты мотивов: строки по 11 символов, символ = цвет стежка. */
const PALETTE = {
  '.': null,
  g: '#6f9c4f', // зелёный (стебель/лист)
  G: '#4d7a36', // тёмно-зелёный
  r: '#c8352b', // красная нитка
  R: '#8f2018', // тёмно-красный
  p: '#e58aa8', // розовый
  y: '#f0d47a', // светло-жёлтый
  Y: '#e2b53f', // жёлтый
  b: '#8ba9d8', // голубой
  w: '#f7f1e2', // белый
};

const MOTIFS = {
  flower: [
    '....ppp....',
    '...pRrRp...',
    '..pRYYYRp..',
    '..prYYYrp..',
    '..pRYYYRp..',
    '...pRrRp...',
    '....gGg....',
    '...g.G.g...',
    '..g..G..g..',
    '.....G.....',
    '....GGG....',
  ],
  heart: [
    '..rr...rr..',
    '.rRRr.rRRr.',
    'rRRRRrRRRRr',
    'rRRRRRRRRRr',
    'rRRRRRRRRRr',
    '.rRRRRRRRr.',
    '..rRRRRRr..',
    '...rRRRr...',
    '....rRr....',
    '.....r.....',
    '...........',
  ],
  leaf: [
    '........gg.',
    '.......gGg.',
    '......gGGg.',
    '.....gGGGg.',
    '....gGGGGg.',
    '...gGGGgGg.',
    '..gGGGg.Gg.',
    '.gGGGg..Gg.',
    '.gGGg...Gg.',
    '..gg....Gg.',
    '.........G.',
  ],
  star: [
    '.....Y.....',
    '....YYY....',
    '....YYY....',
    'YYYYYYYYYYY',
    '.YYYYYYYYY.',
    '..YYYYYYY..',
    '...YYYYY...',
    '..YYY.YYY..',
    '.YYY...YYY.',
    '.YY.....YY.',
    '...........',
  ],
  bowl: [
    '...........',
    '..b.....b..',
    '...b...b...',
    '..b.....b..',
    '...........',
    'wwwwwwwwwww',
    '.wRRRRRRRw.',
    '.wRRRRRRRw.',
    '..wRRRRRw..',
    '...wwwww...',
    '...........',
  ],
};

/** Отрисовать мотив как SVG-строку. */
export function motifSvg(name) {
  const grid = MOTIFS[name] || MOTIFS.flower;
  const size = grid.length * CELL;
  const stitches = [];

  grid.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const color = PALETTE[char];
      if (!color) return;
      stitches.push(
        `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${color}"/>`
      );
    });
  });

  return `<svg class="card__motif" viewBox="0 0 ${size} ${size}" role="presentation" shape-rendering="crispEdges">${stitches.join(
    ''
  )}</svg>`;
}

/** Пуговица-печать (скин «вышивка») — пришита нитками-крестиком. */
export function buttonSealSvg() {
  return `
<svg class="seal__svg" viewBox="0 0 64 64" role="presentation">
  <circle cx="32" cy="32" r="27" fill="var(--button)"/>
  <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="2"/>
  <circle cx="32" cy="32" r="20" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
  <circle cx="24" cy="24" r="3.4" fill="var(--button-hole)"/>
  <circle cx="40" cy="24" r="3.4" fill="var(--button-hole)"/>
  <circle cx="24" cy="40" r="3.4" fill="var(--button-hole)"/>
  <circle cx="40" cy="40" r="3.4" fill="var(--button-hole)"/>
  <g class="seal__thread">
    <line x1="24" y1="24" x2="40" y2="40"/>
    <line x1="40" y1="24" x2="24" y2="40"/>
  </g>
</svg>`;
}

/** Печать-цветок (скин «ретро»). */
export function flowerSealSvg() {
  return `
<svg class="seal__svg" viewBox="0 0 64 64" role="presentation">
  <circle cx="32" cy="32" r="27" fill="var(--button)"/>
  <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="2"/>
  <g fill="var(--frame)">
    <ellipse cx="32" cy="19" rx="5" ry="8"/>
    <ellipse cx="32" cy="45" rx="5" ry="8"/>
    <ellipse cx="19" cy="32" rx="8" ry="5"/>
    <ellipse cx="45" cy="32" rx="8" ry="5"/>
  </g>
  <circle cx="32" cy="32" r="6" fill="var(--thread)"/>
</svg>`;
}
