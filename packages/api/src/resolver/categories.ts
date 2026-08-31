/**
 * OSM отдаёт машинные типы (`amenity=cafe`), а в карточке и фасетах нужны
 * человеческие слова. Незнакомый тип лучше оставить пустым, чем показать гостю
 * «fast_food» — фасет по такому значению всё равно бесполезен.
 */
const BY_TYPE: Record<string, string> = {
  cafe: 'Кофейня',
  coffee_shop: 'Кофейня',
  bar: 'Бар',
  pub: 'Бар',
  biergarten: 'Бар',
  wine_bar: 'Винный бар',
  restaurant: 'Ресторан',
  fast_food: 'Быстрая еда',
  food_court: 'Фудкорт',
  ice_cream: 'Мороженое',
  bakery: 'Пекарня',
  confectionery: 'Кондитерская',
  pastry: 'Кондитерская',
  deli: 'Гастрономия',
  bookshop: 'Книжный',
  books: 'Книжный',
  nightclub: 'Клуб',
  theatre: 'Театр',
  cinema: 'Кино',
  museum: 'Музей',
  gallery: 'Галерея',
  artwork: 'Арт-объект',
  attraction: 'Достопримечательность',
  viewpoint: 'Смотровая',
  park: 'Парк',
  garden: 'Сад',
  beach: 'Пляж',
  library: 'Библиотека',
  marketplace: 'Рынок',
  hotel: 'Отель',
  hostel: 'Хостел',
  spa: 'Спа',
  sauna: 'Баня',
  swimming_pool: 'Бассейн',
  fitness_centre: 'Спортзал',
  climbing: 'Скалодром',
};

const BY_CLASS: Record<string, string> = {
  tourism: 'Достопримечательность',
  leisure: 'Досуг',
  historic: 'Историческое место',
};

export function humanCategory(osmClass?: string | null, osmType?: string | null): string | null {
  if (osmType && BY_TYPE[osmType]) return BY_TYPE[osmType];
  if (osmClass && BY_CLASS[osmClass]) return BY_CLASS[osmClass];
  return null;
}
