import { useState } from 'react';
import type { AnswerResponse, InviteResponse } from '@invite/shared';
import { AnswerError } from './api.js';
import resultUrl from './assets/result.svg';
import titleUrl from './assets/title.svg';
import { LensFilter } from './components/LensFilter.js';
import { NoteComposer } from './components/NoteComposer.js';
import { CardCycle } from './components/envelope/CardCycle.js';
import { Envelope, useEnvelopeOpening } from './components/envelope/Envelope.js';
import { Pile, usePileReveal } from './components/pile/Pile.js';
import { usePrefersReducedMotion } from './components/envelope/usePrefersReducedMotion.js';
import type { Entry } from './entry.js';

interface InvitePageProps {
  invite: InviteResponse;
  /** Чем открывается приглашение: кучкой мини-превью или конвертом. */
  entry: Entry;
  /** Отправку внедряет App: у демо-режима она своя, без бэкенда. */
  onSubmit(chosenPlaceId: string, message: string | null): Promise<AnswerResponse>;
  onUpdate(invite: InviteResponse): void;
}

export function InvitePage({ invite, entry, onSubmit, onUpdate }: InvitePageProps) {
  const answered = invite.answer !== null;
  const expired = invite.status === 'expired';
  const readOnly = answered || expired;
  const reducedMotion = usePrefersReducedMotion();

  const [selected, setSelected] = useState<string | null>(invite.answer?.chosen_place_id ?? null);
  // Заметка необязательна: пустую отправка превращает в null. Готовые фразы,
  // которыми она набирается в один тап, живут в самом поле (NoteComposer).
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Истёкшее приглашение и просьбу не анимировать открываем сразу: в первом
  // случае распечатывать нечего, во втором человек попросил не двигать интерфейс.
  //
  // Хук у каждого входа свой, и зовут их оба: условных хуков не бывает. Тот, что
  // сейчас не выбран, получает autoOpen и сразу садится в 'open' — он не держит
  // таймеров и ничего не считает, пока его не позовут.
  const skip = readOnly || reducedMotion;
  const envelope = useEnvelopeOpening(entry !== 'envelope' || skip, invite.places.length);
  const pile = usePileReveal(entry !== 'pile' || skip);
  const { state, open } = entry === 'envelope' ? envelope : pile;

  // Повторный клик по уже выбранному месту снимает выбор — тогда нижняя панель
  // прячется, и можно передумать, не выбирая другую карточку.
  function toggle(id: string) {
    setSelected((prev) => (prev === id ? null : id));
  }

  async function submit() {
    if (!selected || sending) return;
    setSending(true);
    setError(null);
    try {
      const answer = await onSubmit(selected, message.trim() || null);
      onUpdate({ ...invite, status: 'answered', answer });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof AnswerError ? err.message : 'Не получилось отправить ответ');
    } finally {
      setSending(false);
    }
  }

  if (answered) {
    return (
      <main className="page">
        <header className="done">
          {/* Ответная надпись «Looks good. Can't wait to see you» живёт здесь, а
              не в момент выбора: пока место только выбрано и заметка ещё пишется,
              ответить хосту нечем — ответ появляется, когда он отправлен. Та же
              рисованная надпись, что и вопрос в шапке (assets/result.svg). */}
          <img
            className="done__lettering"
            src={resultUrl}
            alt="Looks good. Can't wait to see you"
          />
        </header>

        <p className="attribution">Данные о местах — © участники OpenStreetMap</p>
      </main>
    );
  }

  // Голый экран: до тапа на кучке не видно ничего, кроме неё самой.
  //
  // Признак снимается в момент тапа, но раскладку он больше не меняет: шапка и
  // подпись скрыты видимостью, а место занимают всегда (разбор в invite.css).
  // Прыжка по вертикали в первый кадр после нажатия поэтому нет — прятать под
  // замутнение или уводить в середину роста больше нечего.
  //
  // Шапка при этом появляется по-прежнему вместе с ростом: её проявление ждёт
  // своей очереди задержкой (--pile-lead в invite.css), а не этим признаком.
  const bare = entry === 'pile' && state === 'sealed';

  // Место выбрано, и ответ ещё не отправлен: заголовок сменился на ответный,
  // рядом с ним стоит кнопка назад, под карточкой открыто поле заметки.
  const picking = selected !== null && !readOnly;

  return (
    <main
      className="page"
      data-variant={entry}
      data-bare={bare || undefined}
      data-picking={picking || undefined}
    >
      <LensFilter />

      <header className="hero">
        <div className="hero__row">
          {/* Крестик закрывает выбор и возвращает ко всем карточкам. Видна кнопка
              только при выборе (hero__back--on); место она занимает всегда, даже
              невидимая, — иначе на экране всех карточек заголовок съезжал бы вбок
              ровно в тот кадр, в котором растёт карточка, и два движения читались
              бы рывком. На экране выбранного места (data-picking) заголовка нет,
              и CSS уводит кнопку из центра к правому краю карточки. */}
          <button
            type="button"
            className={`hero__back${picking ? ' hero__back--on' : ''}`}
            tabIndex={picking ? undefined : -1}
            aria-hidden={picking ? undefined : true}
            onClick={() => setSelected(null)}
          >
            <CloseIcon />
            <span className="visually-hidden">Вернуться ко всем местам</span>
          </button>

          {/* Заголовок — не набранный текст, а готовая надпись: буквы в ней
              подогнаны вручную, шрифтом такое не повторить. Пока место выбирают
              и пишут заметку, страница по-прежнему спрашивает: ответная надпись
              «Looks good» — это уже реплика на отправленный ответ, и живёт она на
              экране «Ответ отправлен» (ветка выше), а не в момент выбора. */}
          <div className="hero__titles">
            <img
              className="hero__title hero__title--on"
              src={titleUrl}
              alt="Shall we meet up? Where do you want to go?"
            />
          </div>
        </div>
      </header>

      <section
        className="reveal"
        data-state={state}
        data-variant={entry}
        /*
         * Размер колоды нужен самой сцене, а не только колоде: по нему кучка
         * считает свою высоту в уменьшенном виде и ставит мишень с глифом ровно
         * на верхнюю карточку. Колода объявляет его же у себя — она умеет
         * работать и вне этой сцены.
         */
        style={{ '--n': Math.max(1, invite.places.length) } as React.CSSProperties}
      >
        {entry === 'envelope' ? (
          <Envelope state={state} onOpen={open} />
        ) : (
          // Кучка живёт ровно свой такт — до конца дымки, — и уходит, не
          // дожидаясь конца роста.
          //
          // Раньше она досиживала до 'open', и это стоило верхней карточке
          // отдельного, ни с чем не связанного вздрагивания в самом конце.
          // Виден там уже не блюр: к концу такта и замутнение, и пелена, и
          // мишень стоят на нуле. Виден снос слоя. Замутнение — backdrop-filter
          // (.pile__haze), а он и с нулевым радиусом снимает подложку в
          // отдельную поверхность; убирается слой — карточка растеризуется
          // заново. Пока это происходило после роста, рябь приходилась на
          // остановившуюся картинку, где её ни с чем не спутать.
          //
          // Теперь тот же снос приходится на границу тактов: движение только
          // начинается, и прятать его больше ни во что не нужно.
          (state === 'sealed' || state === 'unsealing') && <Pile state={state} onOpen={open} />
        )}
        <CardCycle
          places={invite.places}
          selected={selected}
          readOnly={readOnly}
          state={state}
          onSelect={toggle}
        />

        {/* Поле-заметка стоит внутри сцены, сразу под колодой, — так в макете:
            ответ пишут не в отдельной панели у края экрана, а под той самой
            карточкой, которую только что выбрали. */}
        {!readOnly && (
          <NoteComposer
            value={message}
            open={picking}
            sending={sending}
            error={error}
            onChange={setMessage}
            onSubmit={submit}
          />
        )}
      </section>

      <p className="attribution">Данные о местах — © участники OpenStreetMap</p>
    </main>
  );
}

/*
 * Крестик на кнопке закрытия. Нарисован здесь, а не файлом: в макете иконки нет,
 * а обводка обязана брать цвет у кнопки — иначе на стекле она темнеет вместе
 * с тем, что под ним просвечивает. Так же сделаны глиф на мишени кучки
 * (components/pile/Pile.tsx) и сургучная печать.
 */
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 6l8 8M14 6l-8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
