import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface FilterMenuProps {
  label: string;
  options: string[];
  value?: string;
  onChange(value: string | undefined): void;
}

/** Native dialog supplies focus containment, Escape and focus return on close. */
export function FilterMenu({ label, options, value, onChange }: FilterMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const open = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - 256)), top: rect.bottom + 8 });
    dialogRef.current?.showModal();
  };
  const choose = (option?: string) => {
    onChange(option);
    dialogRef.current?.close();
  };

  return (
    <div className="filter-menu">
      <button type="button" className={`filter-menu__trigger${value ? ' filter-menu__trigger--active' : ''}`}
        aria-haspopup="dialog" aria-label={`${label}: ${value ?? 'все'}`}
        onClick={(event) => open(event.currentTarget)}>
        <span>{value ?? label}</span>
      </button>
      <dialog ref={dialogRef} className="filter-menu__panel" aria-label={label}
        style={{ '--filter-left': `${position.left}px`, '--filter-top': `${position.top}px` } as CSSProperties}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
        }}>
        <div className="filter-menu__head">
          <h2>{label}</h2>
        </div>
        <div className="filter-menu__options">
          {[undefined, ...options].map((option) => (
            <button type="button" key={option ?? '__all'} className="filter-menu__option"
              aria-pressed={value === option} onClick={() => choose(option)}>
              <span>{option ?? 'Все'}</span><span aria-hidden="true">{value === option ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      </dialog>
    </div>
  );
}
