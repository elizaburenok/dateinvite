import { useLayoutEffect, useRef } from 'react';

/**
 * Готовые фразы под полем. Ими закрыт тот же случай, что раньше закрывал
 * предзаполненный текст: чаще всего достаточно согласиться, а не сочинять. Но
 * поле при этом остаётся пустым — и видно, что оно пустое.
 *
 * Фразы дополняют друг друга, а не спорят: два тапа складываются в ту самую
 * строку, которая раньше стояла по умолчанию.
 */
const SUGGESTIONS = ['Sounds awesome!', 'See you at 7pm', 'Can I bring a friend?'];

interface NoteComposerProps {
  value: string;
  /** Панель появляется вместе с выбором места: до него отправлять нечего. */
  open: boolean;
  sending: boolean;
  error: string | null;
  onChange(value: string): void;
  onSubmit(): void;
}

/**
 * Поле-заметка под выбранной карточкой.
 *
 * Единственное тёмное пятно на всей светлой странице — так в макете, и это же
 * делает всю работу: карточка выше остаётся главной, а ответ читается вторым
 * шагом, не споря с ней за внимание. Отдельной кнопки-плашки внизу больше нет,
 * «Send» живёт внутри поля.
 *
 * Поле пустое, с плейсхолдером и подсказками-фразами под ним. Предзаполненный
 * текст раньше решал ту же задачу — не заставлять сочинять, — но заодно и
 * прятал поле: заполненная строка на тёмном стекле читалась готовым сообщением,
 * а не местом, куда пишут.
 */
export function NoteComposer({
  value,
  open,
  sending,
  error,
  onChange,
  onSubmit,
}: NoteComposerProps) {
  const field = useRef<HTMLTextAreaElement>(null);
  // Поднят тапом по подсказке: после вставки курсор нужно увести в конец строки
  // — но сделать это можно только когда новый текст уже в DOM.
  const catchUp = useRef(false);

  // Поле растёт под текст. Высоту сбрасываем перед замером: scrollHeight у
  // растянутого поля равен его же высоте, и без сброса оно умеет только расти.
  //
  // useLayoutEffect, а не useEffect: замер и запись высоты обязаны попасть в тот
  // же кадр, что и новый текст, иначе на длинной строке видно, как поле
  // догоняет её отдельным движением.
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;

    if (!catchUp.current) return;
    catchUp.current = false;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [value]);

  // Подсказка не заменяет написанное, а дописывается: фразы короткие и
  // складываются в одну реплику. Использованную гасим — второй тап дал бы
  // «See you at 7pm See you at 7pm».
  function append(phrase: string) {
    const head = value.trim();
    catchUp.current = true;
    onChange(head ? `${head} ${phrase}` : phrase);
  }

  return (
    <form
      className={`note${open ? ' note--open' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="visually-hidden" htmlFor="guest-message">
        Note to the host
      </label>
      {/* Подпись поля — не <label>: настоящий лежит рядом, скрытым, а этот
          текст читается заголовком заметки и повторял бы его вслух. */}
      <span className="note__label" aria-hidden="true">
        Add note
      </span>

      <textarea
        id="guest-message"
        ref={field}
        className="note__field"
        rows={1}
        maxLength={500}
        placeholder="Write something…"
        value={value}
        disabled={sending}
        onChange={(event) => onChange(event.target.value)}
        // У <textarea> Enter — это перенос строки, и форма его не ловит. Здесь
        // заметка в одну-две строки, поэтому Enter отправляет, а перенос — по
        // Shift+Enter, как в мессенджерах, откуда на эту страницу и приходят.
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey) return;
          event.preventDefault();
          onSubmit();
        }}
      />

      <div className="note__chips">
        {SUGGESTIONS.map((phrase) => (
          <button
            key={phrase}
            type="button"
            className="note__chip"
            // tabIndex не трогаем: подсказки — часть поля, и с клавиатуры до
            // них доходят так же, как мышью.
            disabled={sending || value.includes(phrase)}
            onClick={() => append(phrase)}
          >
            {phrase}
          </button>
        ))}
      </div>

      <button type="submit" className="note__send" disabled={sending}>
        {sending ? 'Sending…' : 'Send'}
      </button>

      {error && <p className="note__error">{error}</p>}
    </form>
  );
}
