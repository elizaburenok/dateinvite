import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import photo from './assets/places-feed/preview-first.jpg';
import photo2 from './assets/places-feed/preview-second.png';
import './styles/envelope-title-demos.css';

const options = [
  {id:'letter', name:'01 · Личная записка', description:'Крупная надпись в две строки и короткое пояснение. Пунктир ведёт взгляд от заголовка к фотографиям.', hint:'Рекомендую: заметно, тепло и связано с карточками.'},
  {id:'seal', name:'02 · Печать готовности', description:'Заголовок становится круглой печатью, которая перекрывает край первой карточки. Конверт ощущается собранным и готовым к отправке.', hint:'Самый предметный вариант: статус буквально прикреплён к месту.'},
  {id:'label', name:'03 · Обложка подборки', description:'Заголовок и число мест собраны в одну бумажную этикетку над фотографиями. Общая вертикаль делает их единым блоком.', hint:'Спокойный вариант с чёткой иерархией.'},
];
function Demo() {
 const [original,setOriginal]=useState(false);
 const [picked,setPicked]=useState('letter');
 return <main className="title-lab"><header className="title-lab__intro"><div><p>FROMOUT / ИССЛЕДОВАНИЕ ЗАГОЛОВКА</p><h1>Готово к хорошему вечеру</h1><p>Три способа связать «Your envelope is ready» с выбранными местами.</p></div><button onClick={()=>setOriginal(!original)} aria-pressed={original}>{original?'Показать варианты':'Сравнить с текущим'}</button></header>
 <section className="title-lab__grid">{options.map(option=><article key={option.id}><h2>{option.name}</h2><div className={`title-scene title-scene--${original?'original':option.id}`}>
 <button className="title-scene__back" aria-label="Назад" onClick={()=>setOriginal(!original)}>←</button>
 <div className="title-scene__heading"><span className="title-scene__eyebrow">A LITTLE INVITATION</span><h3>Your envelope<br className="title-scene__break"/> is ready</h3><span className="title-scene__subtitle">Two places. One lovely plan.</span><span className="title-scene__count">02 PLACES INSIDE</span></div>
 <div className="title-scene__places"><figure><img src={photo} alt="Интерьер выбранного места"/><figcaption>Atelier de<br/> tartelettes</figcaption></figure><figure><img src={photo2} alt="Второе выбранное место"/><figcaption>Kooperative<br/> Chorny</figcaption></figure></div>
 <button className="title-scene__send" onClick={()=>setPicked(option.id)}>{picked===option.id?'Вариант отмечен ✓':'Send envelope'}</button></div><p className="title-lab__hint">{option.hint}</p><p>{option.description}</p><button className="title-lab__choose" aria-pressed={picked===option.id} onClick={()=>setPicked(option.id)}>{picked===option.id?'Выбран для обсуждения ✓':'Отметить вариант'}</button></article>)}</section><footer>Демо оформления. Отметки сохраняются только до перезагрузки; приглашение не отправляется.</footer></main>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
