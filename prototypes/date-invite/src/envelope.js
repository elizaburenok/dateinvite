/**
 * Конверт собран из трёх слоёв-сиблингов, между которыми лежит колода карточек.
 * Так карточка одновременно выезжает ИЗ кармана (карман поверх неё)
 * и поднимается ПЕРЕД откинутым клапаном:
 *
 *   env-layer--back   (z 1)  задник конверта
 *   deck              (z 4)  карточки
 *   env-layer--front  (z 5)  карман + адрес
 *   env-layer--flaps  (z 6 закрыт → z 0 открыт) клапаны
 *   env-layer--seal   (z 8)  печать-пуговица
 *
 * Варианты раскрытия ('pocket' / 'four') различаются только CSS —
 * DOM один и тот же, лишние клапаны прячутся стилями.
 */

import { buttonSealSvg, flowerSealSvg } from './motifs.js';
import { copy } from './config.js';

export function renderEnvelope({ skin, toName }) {
  const back = document.createElement('div');
  back.className = 'env-layer env-layer--back';
  back.innerHTML = `<div class="env-back"></div>`;

  const front = document.createElement('div');
  front.className = 'env-layer env-layer--front';
  front.innerHTML = `
    <div class="env-front"></div>
    <div class="env-address">
      <span>${escapeHtml(copy.sealedFor(toName))}</span>
      <span class="env-address__rule"></span>
    </div>
  `;

  // Печать — отдельным слоем поверх всего: и над клапанами (закрытый конверт),
  // и над задником в финале, когда конверт снова запечатан.
  const sealLayer = document.createElement('div');
  sealLayer.className = 'env-layer env-layer--seal';
  sealLayer.innerHTML = `
    <button class="seal" type="button" aria-label="Открыть конверт">
      ${skin === 'stitch' ? buttonSealSvg() : flowerSealSvg()}
    </button>
  `;

  const flaps = document.createElement('div');
  flaps.className = 'env-layer env-layer--flaps';
  flaps.innerHTML = `
    <div class="env-flap env-flap--left"></div>
    <div class="env-flap env-flap--right"></div>
    <div class="env-flap env-flap--bottom"></div>
    <div class="env-flap env-flap--top"></div>
  `;

  return {
    back,
    front,
    flaps,
    sealLayer,
    seal: sealLayer.querySelector('.seal'),
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
