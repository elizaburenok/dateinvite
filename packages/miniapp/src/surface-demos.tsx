import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { PlaceWithCandidates } from '@invite/shared';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import { Home } from './screens/Home.js';
import photo from './assets/places-feed/preview-first.jpg';
import './styles/surface-demos.css';

const place: PlaceWithCandidates = {
  id: 'surface-demo', name: 'Кафе', address: '', district: null, category: 'Кафе',
  photos: [photo], photo_url: photo, lat: null, lng: null, maps_url: null,
  rating: null, hours: null, note: null, tags: [], source: 'manual',
  enrichment_status: 'resolved', created_at: '', candidates: [],
};
const options = [
  { id: 'mist', number: '01', name: 'Тёплая дымка', text: 'Полупрозрачный сливочный слой, контрастный тёплый серо-коричневый текст и мягкий объём по краям. Свет сверху и тёплая тень снизу придают поверхности глубину.', detail: 'Контрастный текст · мягкий объём' },
  { id: 'milk', number: '02', name: 'Молочная керамика', text: 'Почти непрозрачная тёплая поверхность и спокойный серо-коричневый текст. Объём даёт лишь тонкая внешняя тень.', detail: 'Самый спокойный и домашний' },
  { id: 'veil', number: '03', name: 'Льняная вуаль', text: 'Лёгкий светлый слой с тонким контуром. Без свечения и выпуклого края: простая форма, больше воздуха.', detail: 'Самый лёгкий и сдержанный' },
];

function SurfaceDemos() {
  const [original, setOriginal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="surface-lab">
    <header className="surface-lab__header">
      <div><p className="surface-lab__eyebrow">fromout / исследование материалов</p>
        <h1>Мягче по ощущению.<br />Проще по форме.</h1>
        <p>Три светлых направления для плашек и кнопок. Одинаковые фото, логотип и композиция — сравниваем только материал.</p>
      </div>
      <button className="surface-lab__toggle" aria-pressed={original} onClick={() => setOriginal(!original)}>
        {original ? 'Вернуть варианты' : 'Сравнить с текущим стилем'}
      </button>
    </header>
    <div className="surface-lab__grid">{options.map(option => <article key={option.id}>
      <div className="surface-lab__caption"><span>{option.number}</span><h2>{option.name}</h2></div>
      <div className={`surface-lab__screen ${original ? '' : `surface--${option.id}`}`}>
        <Home latestPlace={place} onOpenLibrary={() => setSelected(option.id)} onCreateEnvelope={() => setSelected(option.id)} />
      </div>
      <p className="surface-lab__detail">{original ? 'Текущий стиль прототипа' : option.detail}</p>
      <p className="surface-lab__description">{option.text}</p>
      <button className="surface-lab__choose" aria-pressed={selected === option.id} onClick={() => setSelected(option.id)}>
        {selected === option.id ? 'Отмечен для обсуждения ✓' : 'Отметить вариант'}
      </button>
    </article>)}</div>
    <footer>Мой ориентир — «Тёплая дымка»: она сохраняет связь с фотографией, а сливочный оттенок и мягкий край поддерживают характер логотипа. Выбор здесь отмечает вариант только в демо.</footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<SurfaceDemos />);
