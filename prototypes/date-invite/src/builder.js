import './builder.css';
import { starterDraft, normalizeDraft } from './draft.js';

const draft = starterDraft();
const app = document.getElementById('app');
const motifs = ['flower', 'bowl', 'heart', 'leaf', 'star'];

app.innerHTML = `
  <main class="builder">
    <header class="builder__header">
      <p class="builder__eyebrow">приглашение в конверте</p>
      <h1>Соберите свой конверт</h1>
      <p>Напишите приглашение и добавьте до пяти мест. Готовой ссылкой можно поделиться.</p>
    </header>
    <form id="builder-form">
      <section class="builder__section">
        <h2>Для кого</h2>
        <div class="builder__row">
          <label>Кому <input name="to" maxlength="50" required /></label>
          <label>От кого <input name="from" maxlength="50" required /></label>
        </div>
      </section>
      <section class="builder__section">
        <h2>Текст приглашения</h2>
        <label>Заголовок <input name="title" maxlength="70" required /></label>
        <label>Первая строка <textarea name="line1" maxlength="160"></textarea></label>
        <label>Вторая строка <textarea name="line2" maxlength="160"></textarea></label>
      </section>
      <section class="builder__section">
        <h2>Места</h2>
        <div id="places"></div>
        <button class="builder__secondary" type="button" id="add-place">Добавить место</button>
      </section>
      <section class="builder__section">
        <h2>Внешний вид</h2>
        <div class="builder__row">
          <label>Стиль <select name="skin"><option value="stitch">Вышивка</option><option value="retro">Ретро</option></select></label>
          <label>Конверт <select name="open"><option value="pocket">Карман</option><option value="four">Четыре клапана</option></select></label>
          <label>Карточки <select name="cards"><option value="tucked">В конверте</option><option value="center">По центру</option></select></label>
        </div>
      </section>
      <button class="builder__primary" type="submit">Создать ссылку</button>
    </form>
    <div id="result" class="builder__result" hidden>
      <a id="preview" target="_blank" rel="noopener">Открыть приглашение</a>
      <button class="builder__secondary" type="button" id="copy-link">Скопировать ссылку</button>
      <p id="copy-status" role="status"></p>
    </div>
  </main>
`;

const form = document.getElementById('builder-form');
const places = document.getElementById('places');
const addPlace = document.getElementById('add-place');
const result = document.getElementById('result');
const preview = document.getElementById('preview');
const copyStatus = document.getElementById('copy-status');
let currentUrl = '';

function placeFields(place = { name: '', tag: '', note: '', motif: 'heart' }) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'builder__place';
  fieldset.innerHTML = `
    <legend>Место</legend>
    <label>Название <input name="place-name" maxlength="60" required /></label>
    <label>Подпись <input name="place-tag" maxlength="40" /></label>
    <label>Описание <textarea name="place-note" maxlength="180"></textarea></label>
    <div class="builder__row">
      <label>Рисунок <select name="place-motif">${motifs.map((motif) => `<option value="${motif}">${motif}</option>`).join('')}</select></label>
      <button class="builder__secondary" type="button" data-remove>Удалить место</button>
    </div>
  `;
  fieldset.querySelector('[name="place-name"]').value = place.name;
  fieldset.querySelector('[name="place-tag"]').value = place.tag;
  fieldset.querySelector('[name="place-note"]').value = place.note;
  fieldset.querySelector('[name="place-motif"]').value = place.motif;
  fieldset.querySelector('[data-remove]').addEventListener('click', () => {
    if (places.children.length > 1) fieldset.remove();
    addPlace.disabled = false;
    result.hidden = true;
  });
  places.append(fieldset);
  addPlace.disabled = places.children.length >= 5;
}

form.elements.to.value = draft.to;
form.elements.from.value = draft.from;
form.elements.title.value = draft.invitation.title;
form.elements.line1.value = draft.invitation.lines[0] ?? '';
form.elements.line2.value = draft.invitation.lines[1] ?? '';
form.elements.skin.value = draft.skin;
form.elements.open.value = draft.open;
form.elements.cards.value = draft.cards;
draft.places.forEach(placeFields);
addPlace.addEventListener('click', () => placeFields());
form.addEventListener('input', () => { result.hidden = true; });

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = (name) => form.elements[name].value.trim();
  const normalized = normalizeDraft({
    to: value('to'), from: value('from'),
    skin: value('skin'), open: value('open'), cards: value('cards'),
    invitation: { title: value('title'), lines: [value('line1'), value('line2')] },
    places: [...places.children].map((fieldset) => ({
      name: fieldset.querySelector('[name="place-name"]').value.trim(),
      tag: fieldset.querySelector('[name="place-tag"]').value.trim(),
      note: fieldset.querySelector('[name="place-note"]').value.trim(),
      motif: fieldset.querySelector('[name="place-motif"]').value,
    })),
  });
  if (!normalized) return;
  const url = new URL('invite.html', location.href);
  url.searchParams.set('draft', JSON.stringify(normalized));
  currentUrl = url.href;
  preview.href = currentUrl;
  copyStatus.textContent = '';
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentUrl);
    copyStatus.textContent = 'Ссылка скопирована';
  } catch {
    copyStatus.textContent = 'Не удалось скопировать. Откройте приглашение и скопируйте адрес страницы.';
  }
});
