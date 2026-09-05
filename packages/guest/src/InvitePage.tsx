import { useMemo, useState } from 'react';
import type { AnswerResponse, InviteResponse } from '@invite/shared';
import { AnswerError } from './api.js';
import resultUrl from './assets/result.svg';
import titleUrl from './assets/title.svg';
import { LensFilter } from './components/LensFilter.js';
import { NoteComposer } from './components/NoteComposer.js';
import { PlaceCard } from './components/PlaceCard.js';
import { WaxSeal } from './components/WaxSeal.js';
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
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

  const chosenPlace = useMemo(
    () => invite.places.find((place) => place.id === invite.answer?.chosen_place_id) ?? null,
    [invite],
  );

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

  if (answered && chosenPlace) {
    return (
      <main className="page">
        {/* Фильтр стеклянной кромки — по одному на страницу, у него общий id.
            Стоит в обеих ветках, потому что карточка есть и здесь. */}
        <LensFilter />

        <header className="done">
          <WaxSeal size={64} checked />
          <h1 className="done__title">Ответ отправлен</h1>
          <p className="done__text">
            Вы выбрали <b>{chosenPlace.name}</b>
            {chosenPlace.district ? `, ${chosenPlace.district}` : ''}.
            {invite.answer?.message ? ` Передали: «${invite.answer.message}»` : ''}
          </p>
        </header>

        <section className="cards">
          <PlaceCard place={chosenPlace} selected readOnly onSelect={() => {}} />
        </section>

        <p className="attribution">Данные о местах — © участники OpenStreetMap</p>
      </main>
    );
  }

  // Голый экран: до тапа на кучке нет ничего, кроме неё самой, — так в макете.
  //
  // Снимается он в момент тапа, а не к концу дымки. Смена раскладки — не
  // анимация: страница перестаёт центрироваться, шапка занимает свои триста
  // пикселей, и кучка перепрыгивает по вертикали на десятки пикселей разом.
  // Сгладить этот кадр нечем, его можно только поставить туда, где он не виден,
  // — под полное замутнение, в кадр, где глаз занят сжимающимся глифом, а
  // карточки нечитаемы в принципе. Посреди роста, где он стоял раньше, тот же
  // прыжок читался рывком.
  //
  // Шапка при этом появляется по-прежнему вместе с ростом: её проявление ждёт
  // своей очереди задержкой (--pile-lead в invite.css), а не этим признаком.
  const bare = entry === 'pile' && state === 'sealed';

  // Место выбрано, и ответ ещё не отправлен: заголовок сменился на ответный,
  // рядом с ним стоит кнопка назад, под карточкой открыто поле заметки.
  const picking = selected !== null && !readOnly;

  return (
    <main className="page" data-variant={entry} data-bare={bare || undefined}>
      <LensFilter />

      <header className="hero">
        <div className="hero__row">
          {/* Второй способ вернуть колоду, кроме повторного нажатия на саму
              карточку: в фокусе соседей не видно, и «просто отвести курсор»
              больше ничего не листает. Место кнопка занимает всегда, даже
              невидимая: иначе заголовок съезжал бы вбок ровно в тот кадр, в
              котором растёт карточка, и два движения читались бы рывком. */}
          <button
            type="button"
            className={`hero__back${picking ? ' hero__back--on' : ''}`}
            tabIndex={picking ? undefined : -1}
            aria-hidden={picking ? undefined : true}
            onClick={() => setSelected(null)}
          >
            <BackArrow />
            <span className="visually-hidden">Смотреть другие места</span>
          </button>

          {/* Заголовки — не набранный текст, а готовые надписи: буквы в них
              подогнаны вручную, шрифтом такое не повторить. Их две, и меняются
              они вместе с выбором: до него страница спрашивает, после —
              отвечает. Лежат стопкой в одной ячейке грида, потому что подмена
              src читалась бы миганием, а высоту строки держат обе сразу. */}
          <div className="hero__titles">
            <img
              className={`hero__title${picking ? '' : ' hero__title--on'}`}
              src={titleUrl}
              alt="Shall we meet up? Where do you want to go?"
              aria-hidden={picking ? true : undefined}
            />
            <img
              className={`hero__title${picking ? ' hero__title--on' : ''}`}
              src={resultUrl}
              alt="Looks good. Can't wait to see you"
              aria-hidden={picking ? undefined : true}
            />
          </div>
        </div>
        {!expired && invite.expires_at && (
          <p className="caption hero__expiry">Ответить можно до {formatDate(invite.expires_at)}</p>
        )}
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
          // Кучка доживает до конца роста и уходит: в раскрытой карусели ни
          // пелене, ни мишени делать нечего.
          state !== 'open' && <Pile state={state} onOpen={open} />
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
 * Стрелка на кнопке назад. Нарисована здесь, а не файлом: в макете иконки нет,
 * а обводка обязана брать цвет у кнопки — иначе на стекле она темнеет вместе
 * с тем, что под ним просвечивает. Так же сделаны глиф на мишени кучки
 * (components/pile/Pile.tsx) и сургучная печать.
 */
function BackArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
