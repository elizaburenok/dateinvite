/**
 * Переключатель вариантов стопки — только для демо-режима.
 *
 * Два способа показать четыре места лежат рядом и меняются на живой странице,
 * чтобы их можно было сравнить, а не вспоминать. Когда вариант выберут,
 * этот файл и всё, что на него ссылается, уезжают вместе с демо-режимом.
 */

export type StackVariant = 'deck' | 'cycle';

const LABELS: Record<StackVariant, string> = {
  cycle: 'Карусель',
  deck: 'Скролл',
};

/** Основная теперь карусель; стопка со скроллом осталась для сравнения. */
export function stackVariant(search = window.location.search): StackVariant {
  return new URLSearchParams(search).get('stack') === 'deck' ? 'deck' : 'cycle';
}

/** Меняем вариант перезагрузкой: у обоих своё состояние и свой конверт,
    и заново распечатать его — ровно то, что нужно для сравнения. */
function switchTo(next: StackVariant) {
  const url = new URL(window.location.href);
  url.searchParams.set('stack', next);
  window.location.href = url.toString();
}

export function VariantSwitch({ current }: { current: StackVariant }) {
  return (
    <div className="variant" role="group" aria-label="Вариант стопки">
      {(Object.keys(LABELS) as StackVariant[]).map((variant) => (
        <button
          key={variant}
          type="button"
          className={`variant__btn${variant === current ? ' variant__btn--on' : ''}`}
          aria-pressed={variant === current}
          onClick={() => switchTo(variant)}
        >
          {LABELS[variant]}
        </button>
      ))}
    </div>
  );
}
