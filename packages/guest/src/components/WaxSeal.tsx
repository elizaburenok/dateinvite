/**
 * Сургучная печать — единственный декоративный элемент страницы.
 * Она держит метафору конверта и отмечает выбранное место,
 * поэтому у неё две роли: украшение шапки и маркер выбора.
 */
export function WaxSeal({ size = 44, checked = false }: { size?: number; checked?: boolean }) {
  return (
    <svg
      className="seal"
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="seal__blob"
        d="M22 1.5c4.4 0 6.8 3.4 10.4 5 3.6 1.6 8 1.3 9.4 5 1.4 3.7-1.6 7-1.6 10.5S43.2 29 41.8 32.7c-1.4 3.7-5.8 3.4-9.4 5-3.6 1.6-6 5-10.4 5s-6.8-3.4-10.4-5c-3.6-1.6-8-1.3-9.4-5C.8 29 3.8 25.5 3.8 22S.8 15 2.2 11.5c1.4-3.7 5.8-3.4 9.4-5C15.2 4.9 17.6 1.5 22 1.5Z"
      />
      {checked ? (
        <path
          className="seal__mark"
          d="M14.5 22.5 19.5 27.5 30 16.5"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <g className="seal__mark" fill="none" strokeWidth="1.5" strokeLinecap="round">
          <path d="M14 17.5h16M14 22h16M14 26.5h10" />
        </g>
      )}
    </svg>
  );
}
