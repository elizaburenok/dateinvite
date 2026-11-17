import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { PlaceWithCandidates } from '@invite/shared';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/app.css';
import { Home } from './screens/Home.js';
import photo from './assets/places-feed/preview-first.jpg';
import './styles/surface-demos.css';
import './styles/veil-demos.css';
import secondPhoto from './assets/places-feed/preview-second.png';

const place: PlaceWithCandidates = {
  id: 'surface-demo', name: 'Кафе', address: '', district: null, category: 'Кафе',
  photos: [photo], photo_url: photo, lat: null, lng: null, maps_url: null,
  rating: null, hours: null, note: null, tags: [], source: 'manual',
  enrichment_status: 'resolved', created_at: '', candidates: [],
};
const options = [
  { id: 'graphite', number: '01', name: 'Вуаль и графит', text: 'Нейтральная светлая вуаль чуть плотнее исходной. Тёмный графит и сильное размытие отделяют надпись от деталей фотографии.', detail: 'Светлый и спокойный' },
  { id: 'white', number: '02', name: 'Вуаль и белый', text: 'Белые буквы на дымчато-сером стекле. Подложка темнее, чтобы текст оставался заметным даже на светлых участках фотографии.', detail: 'Самый выразительный контраст' },
  { id: 'plum', number: '03', name: 'Вуаль и слива', text: 'Светлая вуаль с лёгким розовым подтоном и глубокий сливовый текст. Цвет связывает интерфейс с розовыми карточками, сохраняя лёгкость.', detail: 'Мягкий цветовой акцент' },
];

function SurfaceDemos() {
  const [original, setOriginal] = useState(false);
  const [alternate, setAlternate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="surface-lab veil-lab">
    <header className="surface-lab__header">
      <div><p className="surface-lab__eyebrow">fromout / льняная вуаль</p>
        <h1>Лёгкая поверхность.<br />Чёткий текст.</h1>
        <p>Три способа сделать текст читаемым на вуали. Переключайте фотографию, чтобы сравнить плашки на разных фонах.</p>
      </div>
      <button className="surface-lab__toggle" aria-pressed={original} onClick={() => setOriginal(!original)}>
        {original ? 'Вернуть варианты' : 'Показать исходную вуаль'}
      </button>
      <button className="surface-lab__toggle" onClick={() => setAlternate(!alternate)}>Сменить фотографию</button>
    </header>
    <div className="surface-lab__grid">{options.map(option => <article key={option.id}>
      <div className="surface-lab__caption"><span>{option.number}</span><h2>{option.name}</h2></div>
      <div className={`surface-lab__screen ${original ? 'surface--veil' : `veil--${option.id}`}`}>
        <Home latestPlace={{ ...place, photo_url: alternate ? secondPhoto : photo }} onOpenLibrary={() => setSelected(option.id)} onCreateEnvelope={() => setSelected(option.id)} />
      </div>
      <p className="surface-lab__detail">{original ? 'Исходная льняная вуаль' : option.detail}</p>
      <p className="surface-lab__description">{option.text}</p>
      <button className="surface-lab__choose" aria-pressed={selected === option.id} onClick={() => setSelected(option.id)}>
        {selected === option.id ? 'Отмечен для обсуждения ✓' : 'Отметить вариант'}
      </button>
    </article>)}</div>
    <footer>Я бы выбрала «Вуаль и графит», если важнее сохранить светлую нейтральную поверхность, или «Вуаль и слива», если хочется чуть больше индивидуальности. Белый текст требует более тёмной подложки — это заметно меняет настроение.</footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<SurfaceDemos />);
