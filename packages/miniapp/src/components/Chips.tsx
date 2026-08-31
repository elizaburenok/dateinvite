interface ChipsProps {
  options: string[];
  value: string | undefined;
  emptyLabel: string;
  onChange(next: string | undefined): void;
}

/** Фасет как ряд чипов: на телефоне это дешевле любого выпадающего списка. */
export function Chips({ options, value, emptyLabel, onChange }: ChipsProps) {
  if (options.length === 0) return null;
  return (
    <div className="chips" role="group" aria-label={emptyLabel}>
      <button
        type="button"
        className={`chip${value === undefined ? ' chip--on' : ''}`}
        onClick={() => onChange(undefined)}
      >
        {emptyLabel}
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`chip${value === option ? ' chip--on' : ''}`}
          onClick={() => onChange(value === option ? undefined : option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
