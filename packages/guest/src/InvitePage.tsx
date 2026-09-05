import { useMemo, useState } from 'react';
import type { AnswerResponse, InviteResponse } from '@invite/shared';
import { AnswerError } from './api.js';
import { PlaceCard } from './components/PlaceCard.js';
import { WaxSeal } from './components/WaxSeal.js';
import { CardCycle } from './components/envelope/CardCycle.js';
import { CardStack } from './components/envelope/CardStack.js';
import { Envelope, useEnvelopeOpening } from './components/envelope/Envelope.js';
import { usePrefersReducedMotion } from './components/envelope/useStackProgress.js';
import type { StackVariant } from './demo/variant.js';

interface InvitePageProps {
  invite: InviteResponse;
  /** Отправку внедряет App: у демо-режима она своя, без бэкенда. */
  onSubmit(chosenPlaceId: string, message: string | null): Promise<AnswerResponse>;
  onUpdate(invite: InviteResponse): void;
  /** Какой стопкой показывать места. Запасной вариант живёт только в демо-режиме. */
  variant?: StackVariant;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function InvitePage({ invite, onSubmit, onUpdate, variant = 'cycle' }: InvitePageProps) {
  const answered = invite.answer !== null;
  const expired = invite.status === 'expired';
  const readOnly = answered || expired;
  const reducedMotion = usePrefersReducedMotion();

  const [selected, setSelected] = useState<string | null>(invite.answer?.chosen_place_id ?? null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Истёкший конверт и просьбу не анимировать открываем сразу: в первом случае
  // распечатывать нечего, во втором человек попросил не двигать интерфейс.
  const { state, open } = useEnvelopeOpening(readOnly || reducedMotion, invite.places.length);

  // Ссылка на карты ушла с карточки — там теперь только фотография и текст поверх
  // неё. Живёт она в нижней панели и появляется вместе с ней: до выбора места
  // открывать нечего, а после выбора это ровно тот вопрос, который возникает.
  const pickedPlace = useMemo(
    () => invite.places.find((place) => place.id === selected) ?? null,
    [invite.places, selected],
  );

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

  const sealed = state === 'sealed';

  return (
    <main className="page">
      <header className="hero">
        <p className="hero__kicker">Вам приглашение</p>
        {invite.host_note && <p className="hero__note">{invite.host_note}</p>}
        <p className="hero__lead">
          {expired
            ? 'Срок этого приглашения истёк.'
            : sealed
              ? 'Нажмите на печать, чтобы открыть.'
              : // Место выбрано — колода стоит на нём одном, и звать выбирать
                // больше некуда: дальше или заметка с отправкой, или назад к колоде.
                selected
                ? 'Можно оставить заметку и отправить.'
                : `Выберите одно место из ${invite.places.length}.`}
        </p>
        {!expired && invite.expires_at && (
          <p className="caption hero__expiry">Ответить можно до {formatDate(invite.expires_at)}</p>
        )}
      </header>

      <section className="reveal" data-state={state}>
        <Envelope state={state} onOpen={open} />
        {variant === 'deck' ? (
          <CardStack
            places={invite.places}
            selected={selected}
            readOnly={readOnly}
            state={state}
            onSelect={toggle}
          />
        ) : (
          <CardCycle
            places={invite.places}
            selected={selected}
            readOnly={readOnly}
            state={state}
            onSelect={toggle}
          />
        )}
      </section>

      <p className="attribution">Данные о местах — © участники OpenStreetMap</p>

      {!readOnly && (
        <div className={`tray${selected ? ' tray--open' : ''}`}>
          <div className="tray__inner">
            {/* Ссылка на карту и выход из фокуса — два второстепенных действия в
                одну строку, и стоит она первой: дальше по панели идут заметка и
                отправка, то есть уже сам ответ. Смешивать их с «а покажи другие»
                нельзя — из панели читается один главный шаг, и это «Отправить». */}
            <div className="tray__aside">
              {pickedPlace?.maps_url && (
                <a
                  className="tray__maps"
                  href={pickedPlace.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {pickedPlace.name} на карте
                </a>
              )}
              {/* Единственный способ вернуть колоду, кроме повторного нажатия на
                  саму карточку: в фокусе соседей не видно, и «просто отвести
                  курсор» больше ничего не листает. */}
              <button className="tray__back" type="button" onClick={() => setSelected(null)}>
                Смотреть другие
              </button>
            </div>
            <label className="visually-hidden" htmlFor="guest-message">
              Сообщение хосту
            </label>
            <input
              id="guest-message"
              className="field tray__field"
              placeholder="Написать в ответ, например «давай к 12?»"
              value={message}
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
            />
            {error && <p className="tray__error">{error}</p>}
            <button
              type="button"
              className="btn btn--primary tray__submit"
              disabled={!selected || sending}
              onClick={submit}
            >
              {sending ? 'Отправляем…' : 'Отправить выбор'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
