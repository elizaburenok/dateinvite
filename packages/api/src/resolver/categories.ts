/**
 * OSM отдаёт машинные типы (`amenity=cafe`), а в карточке и фасетах нужны
 * человеческие слова. Незнакомый тип лучше оставить пустым, чем показать гостю
 * «fast_food» — фасет по такому значению всё равно бесполезен.
 *
 * Слова английские, как и всё остальное в сохранённом месте. Переводить их
 * не нужно: мы не берём их из поста, а выбираем сами по типу объекта.
 * Старые русские значения переписывает миграция 003.
 */
const BY_TYPE: Record<string, string> = {
  cafe: 'Coffee shop',
  coffee_shop: 'Coffee shop',
  bar: 'Bar',
  pub: 'Bar',
  biergarten: 'Bar',
  wine_bar: 'Wine bar',
  restaurant: 'Restaurant',
  fast_food: 'Fast food',
  food_court: 'Food court',
  ice_cream: 'Ice cream',
  bakery: 'Bakery',
  confectionery: 'Patisserie',
  pastry: 'Patisserie',
  deli: 'Deli',
  bookshop: 'Bookshop',
  books: 'Bookshop',
  nightclub: 'Nightclub',
  theatre: 'Theatre',
  cinema: 'Cinema',
  museum: 'Museum',
  gallery: 'Gallery',
  artwork: 'Artwork',
  attraction: 'Attraction',
  viewpoint: 'Viewpoint',
  park: 'Park',
  garden: 'Garden',
  beach: 'Beach',
  library: 'Library',
  marketplace: 'Market',
  hotel: 'Hotel',
  hostel: 'Hostel',
  spa: 'Spa',
  sauna: 'Banya',
  swimming_pool: 'Swimming pool',
  fitness_centre: 'Gym',
  climbing: 'Climbing gym',
};

const BY_CLASS: Record<string, string> = {
  tourism: 'Attraction',
  leisure: 'Leisure',
  historic: 'Historic site',
};

export function humanCategory(osmClass?: string | null, osmType?: string | null): string | null {
  if (osmType && BY_TYPE[osmType]) return BY_TYPE[osmType];
  if (osmClass && BY_CLASS[osmClass]) return BY_CLASS[osmClass];
  return null;
}
