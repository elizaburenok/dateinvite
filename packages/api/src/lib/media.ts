/**
 * В БД фото лежит либо относительным путём `/media/<file>` (наш кеш, §14.4),
 * либо абсолютным URL. Наружу всегда отдаём абсолютный адрес,
 * чтобы гость-страница на другом домене не гадала, куда идти.
 */
export function makePublicUrl(publicBaseUrl: string) {
  return (photoUrl: string | null): string | null => {
    if (!photoUrl) return null;
    if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
    return `${publicBaseUrl}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
  };
}
