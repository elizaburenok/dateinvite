import categoryUrl from '../assets/category.svg';

export function CategoryIcon({ category }: { category: string | null }) {
  const label = category || 'Место';
  const key = label.toLowerCase();
  let drawing;
  if (/coffee|cafe|коф|кафе/.test(key)) {
    drawing = <><path d="M6 10h11v6a5.5 5.5 0 0 1-11 0zM17 11h1a3 3 0 0 1 0 6h-1M8 5v2m4-2v2m4-2v2M5 23h15" /></>;
  } else if (/bar|pub|wine|бар/.test(key)) {
    drawing = <><path d="M7 5h14l-7 9zm7 9v9m-4 0h8M9 8h10" /></>;
  } else if (/restaurant|ресторан/.test(key)) {
    drawing = <><path d="M7 5v7m3-7v7m-6-7v7c0 3 6 3 6 0M7 15v9M21 5c-5 3-5 10 0 10V5zm0 10v9" /></>;
  } else if (/park|garden|парк|сад/.test(key)) {
    drawing = <><path d="m14 4-6 8h3l-5 7h16l-5-7h3zM14 19v5" /></>;
  } else if (/library|book|библиот/.test(key)) {
    drawing = <><path d="M14 7v17M14 7C10 4 5 5 4 6v16c4-2 7-1 10 2 3-3 6-4 10-2V6c-1-1-6-2-10 1z" /></>;
  }
  return (
    <span className={`place-category${drawing ? '' : ' place-category--cluster'}`} title={label} role="img" aria-label={label}>
      {drawing ? <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>
        : <img src={categoryUrl} alt="" aria-hidden="true" />}
    </span>
  );
}
