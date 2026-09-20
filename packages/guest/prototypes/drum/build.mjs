// Склейка стенда в один самодостаточный файл: фотографии из photos/ уезжают в
// data-URI прямо в разметку, чтобы получившийся drum-standalone.html можно было
// открыть где угодно — на другом компьютере или на телефоне — без сервера и без
// папки с картинками рядом.
//
// Запуск:  node build.mjs
// Результат: drum-standalone.html в этой же папке (в гит не кладётся).

import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('./', import.meta.url);
let html = readFileSync(new URL('index.html', here), 'utf8');

for (let i = 1; i <= 4; i++) {
  const b64 = readFileSync(new URL(`photos/${i}.jpg`, here)).toString('base64');
  // Ссылку на файл заменяем на data-URI ровно там, где она стоит в PHOTOS.
  html = html.replace(`'photos/${i}.jpg'`, `'data:image/jpeg;base64,${b64}'`);
}

writeFileSync(new URL('drum-standalone.html', here), html);
console.log('ok → drum-standalone.html', (html.length / 1024).toFixed(0) + 'KB');
