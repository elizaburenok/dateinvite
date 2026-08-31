import { useMemo, useState } from 'react';
import type { InviteResponse } from '@invite/shared';
import { AnswerError, sendAnswer } from './api.js';
import { PlaceCard } from './components/PlaceCard.js';
import { WaxSeal } from './components/WaxSeal.js';

interface InvitePageProps {
  token: string;
  invite: InviteResponse;
  onUpdate(invite: InviteResponse): void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function InvitePage({ token, invite, onUpdate }: InvitePageProps) {
  const answered = invite.answer !== null;
  const expired = invite.status === 'expired';
  const readOnly = answered || expired;

  const [selected, setSelected] = useState<string | null>(invite.answer?.chosen_place_id ?? null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosenPlace = useMemo(
    () => invite.places.find((place) => place.id === invite.answer?.chosen_place_id) ?? null,
    [invite],
  );

  async function submit() {
    if (!selected || sending) return;
    setSending(true);
    setError(null);
    try {
      const answer = await sendAnswer(token, selected, message.trim() || null);
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

        <p className="attribution">
          Данные о местах — © участники OpenStreetMap
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="hero">
        <span className="hero__seal">
          <WaxSeal size={56} />
        </span>
        <p className="hero__kicker">Вам приглашение</p>
        {invite.host_note && <p className="hero__note">{invite.host_note}</p>}
        <p className="hero__lead">
          {expired
            ? 'Срок этого приглашения истёк.'
            : `Выберите одно место из ${invite.places.length}.`}
        </p>
        {!expired && invite.expires_at && (
          <p className="caption hero__expiry">Ответить можно до {formatDate(invite.expires_at)}</p>
        )}
      </header>

      <section className="cards">
        {invite.places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={selected === place.id}
            readOnly={readOnly}
            onSelect={setSelected}
          />
        ))}
      </section>

      <p className="attribution">Данные о местах — © участники OpenStreetMap</p>

      {!readOnly && (
        <div className={`tray${selected ? ' tray--open' : ''}`}>
          <div className="tray__inner">
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
