import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './components/Button.js';
import { PlaceThumb } from './components/PlaceThumb.js';
import photo from './assets/places-feed/preview-first.jpg';
import photo2 from './assets/places-feed/preview-second.png';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/checkbox-options.css';

const options = [
  { id: 'marker', title: '01 · Компактный маркер', label: 'Рекомендую', description: 'Фотография и название на первом плане. Небольшой жёлтый круг подтверждает выбор, не перетягивая внимание.' },
  { id: 'row', title: '02 · Выделение строки', label: 'Заметнее выбор', description: 'Мягкая жёлтая поверхность объединяет выбранное место. Галочка без отдельной подложки разгружает правый край.' },
  { id: 'action', title: '03 · Явное действие', label: 'Понятнее действие', description: 'Подпись «Добавить» объясняет действие. После нажатия она меняется на «В списке» с галочкой.' },
] as const;

const places = [
  ['Kooperative Chorny', 'Лялин переулок, 5', photo],
  ['Atelier de tartelettes', 'Большая Дмитровка, 23', photo2],
  ['Kafe na Khlebozavode', 'Новорязанская, 18', photo],
  ['Тихое место', 'Покровка, 16', photo2],
  ['Coffee Room', 'Малая Бронная, 10', photo],
  ['Галерея', 'Петровка, 25', photo2],
] as const;

function Symbol({ picked }: { picked: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={picked ? 'M3 8.5 6.5 12 13 4.5' : 'M3 8h10M8 3v10'} />
  </svg>;
}

function Option({ option, selected, onPick }: {
  option: typeof options[number]; selected: number[]; onPick: (index: number) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  return <section className="selection-demo" aria-labelledby={`title-${option.id}`}>
    <header className="selection-demo__caption">
      <span className="selection-demo__tag">{option.label}</span>
      <h2 id={`title-${option.id}`}>{option.title}</h2>
      <p>{option.description}</p>
    </header>
    <div className={`selection-phone selection-phone--${option.id}`}>
      <header className="selection-phone__header">
        <div className="selection-phone__eyebrow">НОВЫЙ КОНВЕРТ <span>01 / 02</span></div>
        <h3>{reviewing ? 'Выбранные места' : 'Добавьте места'}</h3>
        <p>{reviewing ? 'Проверьте список перед следующим шагом' : 'Выберите, куда хотите пригласить'}</p>
      </header>
      <div className="selection-phone__section"><span>{reviewing ? 'В вашем конверте' : 'Сохранённые места'}</span><span>{reviewing ? selected.length : places.length}</span></div>
      <ul className="selection-list" aria-label={reviewing ? 'Выбранные места' : 'Выберите места для конверта'}>
        {places.map(([name, address, src], index) => {
          const picked = selected.includes(index);
          if (reviewing && !picked) return null;
          return <li key={name}>
            <button type="button" className="selection-row" aria-pressed={picked} aria-label={`${picked ? 'Убрать' : 'Добавить'}: ${name}`} onClick={() => onPick(index)}>
              <span className="selection-row__photo"><PlaceThumb src={src} name={name} seed={name} /></span>
              <span className="selection-row__identity"><span className="selection-row__name">{name}</span><span className="selection-row__address">{address}</span></span>
              <span className="selection-row__indicator" aria-hidden="true"><Symbol picked={picked} />{option.id === 'action' && <span>{picked ? 'В списке' : 'Добавить'}</span>}</span>
            </button>
          </li>;
        })}
        {reviewing && !selected.length && <li className="selection-list__empty">Пока нет выбранных мест.<br />Вернитесь к списку, чтобы добавить их.</li>}
      </ul>
      <footer className="selection-phone__footer">
        <p aria-live="polite">{selected.length ? <>Выбрано <strong>{selected.length} из {places.length}</strong></> : 'Выберите хотя бы одно место'}</p>
        <Button className="selection-phone__continue" disabled={!reviewing && !selected.length} onClick={() => setReviewing(!reviewing)}>
          {reviewing ? 'Вернуться к выбору' : 'Посмотреть выбор'}<span aria-hidden="true">{reviewing ? '←' : '→'}</span>
        </Button>
      </footer>
    </div>
  </section>;
}

function App() {
  const [selected, setSelected] = useState<number[]>([0, 2]);
  const onPick = (index: number) => setSelected(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index]);
  return <main className="selection-demos">
    <header className="selection-demos__intro">
      <a href="/app/home-preview.html">← На главную</a>
      <p className="selection-demos__eyebrow">INVITE · ВЫБОР МЕСТ</p>
      <h1>Меньше декора.<br />Больше внимания к месту.</h1>
      <p>Три варианта на общей основе: цвета продукта, ровные фотографии, спокойная типографика и жёлтый акцент выбора. Нажмите на место — выбор синхронизируется во всех вариантах.</p>
    </header>
    <div className="selection-demos__grid">{options.map(option => <Option key={option.id} option={option} selected={selected} onPick={onPick} />)}</div>
    <p className="selection-demos__note">Общая основа: Primitive/Primary · Bg/Library · Color/Frame-ink · Inter Tight · Spacing с шагом 2 px</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
