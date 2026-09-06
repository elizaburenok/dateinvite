import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './envelope/usePrefersReducedMotion.js';

/**
 * Примеры того, что сюда пишут. Первый — из макета, второй добавляет второй
 * тон: не «согласен и во сколько», а «согласен и с кем». Печатаются по очереди,
 * так что подсказка заодно показывает, что поле живое, и что ответ короткий.
 */
const EXAMPLES = ['Sounds awesome! See you on 7pm', "Can't wait — can I bring a friend?"];

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
 * Пока поле пустое и не в фокусе, в нём печатается пример ответа с курсором на
 * конце (см. .note__ghost). Он делает две вещи разом: показывает, что тут вообще
 * пишут (тёмное стекло без него читалось надписью), и подсказывает, каким ответ
 * бывает — короткой живой репликой, а не сочинением. Как только человек ставит
 * курсор или начинает печатать, пример гаснет и поле становится обычным.
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
  const reducedMotion = usePrefersReducedMotion();

  const [focused, setFocused] = useState(false);
  // Что сейчас «напечатано» в примере. Пустая строка — поле выглядит пустым.
  const [ghost, setGhost] = useState('');

  // Пример крутится, только пока писать ещё не начали и поле не тронули: после
  // фокуса за курсор отвечает браузер, с первой буквой подсказывать нечего.
  const showExample = open && !focused && value === '';

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
  }, [value]);

  // Печатная машинка. Один рекурсивный таймер вместо интервала: паузы между
  // буквой, концом фразы и её стиранием разной длины, интервалом их не свести.
  //
  // Просьбу не анимировать выполняем буквально — не печатаем, а показываем
  // первый пример целиком: подсказка остаётся, движения нет.
  useEffect(() => {
    if (!showExample) {
      setGhost('');
      return;
    }
    if (reducedMotion) {
      setGhost(EXAMPLES[0] ?? '');
      return;
    }

    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer: number;

    const tick = () => {
      const full = EXAMPLES[phrase] ?? '';
      char += deleting ? -1 : 1;
      setGhost(full.slice(0, char));

      let delay = deleting ? 30 : 55;
      if (!deleting && char === full.length) {
        // Фраза набрана — держим её, чтобы успели прочитать, потом стираем.
        deleting = true;
        delay = 1800;
      } else if (deleting && char === 0) {
        // Стёрли — короткая пауза на пустом поле и следующая фраза по кругу.
        deleting = false;
        phrase = (phrase + 1) % EXAMPLES.length;
        delay = 500;
      }

      timer = window.setTimeout(tick, delay);
    };

    timer = window.setTimeout(tick, 650);
    return () => window.clearTimeout(timer);
  }, [showExample, reducedMotion]);

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

      {/* Обёртка держит пример: он лежит поверх начала строки, а не в потоке,
          поэтому высоту поля (её задаёт текст) не трогает. */}
      <div className="note__input">
        {/* Пример с курсором на конце. Печатается только пока поле пустое и не
            в фокусе; курсор — часть примера, поэтому всегда стоит вплотную к
            последней букве, а не в стороне. aria-hidden: для голоса поле
            подписано настоящим <label>, а бегущий текст читать вслух незачем. */}
        {showExample && (
          <span className="note__ghost" aria-hidden="true">
            {ghost}
            <span className="note__caret" />
          </span>
        )}

        <textarea
          id="guest-message"
          ref={field}
          className="note__field"
          rows={1}
          maxLength={500}
          // Плейсхолдер нужен только для фокуса на пустом поле: до фокуса его
          // закрывает пример, а показывать оба разом — двойная подсказка.
          placeholder={focused ? 'Write something…' : undefined}
          value={value}
          disabled={sending}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
      </div>

      <button type="submit" className="note__send" disabled={sending}>
        {sending ? 'Sending…' : 'Send'}
      </button>

      {error && <p className="note__error">{error}</p>}
    </form>
  );
}
