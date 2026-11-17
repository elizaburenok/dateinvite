import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { PlaceWithCandidates } from '@invite/shared';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import { Home } from './screens/Home.js';
import photo from './assets/places-feed/preview-first.jpg';
import './styles/surface-demos.css';
import './styles/palette-demos.css';

const place: PlaceWithCandidates = {
  id: 'surface-demo', name: 'Кафе', address: '', district: null, category: 'Кафе',
  photos: [photo], photo_url: photo, lat: null, lng: null, maps_url: null,
  rating: null, hours: null, note: null, tags: [], source: 'manual',
  enrichment_status: 'resolved', created_at: '', candidates: [],
};
const options = [
  { id: 'porcelain', number: '01', name: 'Нейтральный фарфор', text: 'Белая дымка с едва заметным серым оттенком. Графитовый текст, мягкие белые блики и нейтральная тень: объём остаётся, кремовый тон исчезает.', detail: 'Самый чистый и универсальный' },
  { id: 'quartz', number: '02', name: 'Пудровый кварц', text: 'Почти белая розовая поверхность и приглушённый сливовый текст. Оттенок подхватывает розовую карточку, но остаётся спокойным и взрослым.', detail: 'Больше характера и связи с карточками' },
  { id: 'sage', number: '03', name: 'Светлый шалфей', text: 'Серо-зелёная дымка и глубокий зелёно-серый текст. Природный оттенок связывает элементы с фотографией и сохраняет ощущение мягкого света.', detail: 'Свежий, естественный и сдержанный' },
];

function SurfaceDemos() {
  const [original, setOriginal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="surface-lab palette-lab">
    <header className="surface-lab__header">
      <div><p className="surface-lab__eyebrow">fromout / цвет и характер</p>
        <h1>Тот же объём.<br />Другой характер.</h1>
        <p>Сохраняем полупрозрачность, semibold и мягкие внутренние тени. Сравниваем три палитры без жёлтого подтона.</p>
      </div>
      <button className="surface-lab__toggle" aria-pressed={original} onClick={() => setOriginal(!original)}>
        {original ? 'Вернуть варианты' : 'Сравнить с текущим стилем'}
      </button>
    </header>
    <div className="surface-lab__grid">{options.map(option => <article key={option.id}>
      <div className="surface-lab__caption"><span>{option.number}</span><h2>{option.name}</h2></div>
      <div className={`surface-lab__screen ${original ? '' : `palette--${option.id}`}`}>
        <Home latestPlace={place} onOpenLibrary={() => setSelected(option.id)} onCreateEnvelope={() => setSelected(option.id)} />
      </div>
      <p className="surface-lab__detail">{original ? 'Текущий стиль прототипа' : option.detail}</p>
      <p className="surface-lab__description">{option.text}</p>
      <button className="surface-lab__choose" aria-pressed={selected === option.id} onClick={() => setSelected(option.id)}>
        {selected === option.id ? 'Отмечен для обсуждения ✓' : 'Отметить вариант'}
      </button>
    </article>)}</div>
    <footer>Я бы начала с «Пудрового кварца»: лёгкий розовый подтон связывает плашки с карточками и добавляет fromout свой характер. «Нейтральный фарфор» — более тихий вариант, если главным акцентом должна оставаться фотография. Отметка варианта действует только в демо.</footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<SurfaceDemos />);
