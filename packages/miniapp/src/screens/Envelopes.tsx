import type { EnvelopeSummary } from '@invite/shared';
import { StatusDot } from '../components/StatusDot.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Мои конверты (§10.4): статус и, для отвеченных, что именно выбрал гость. */
export function Envelopes({ envelopes }: { envelopes: EnvelopeSummary[] }) {
  if (envelopes.length === 0) {
    return (
      <div className="screen">
        <p className="empty">
          Конвертов пока нет. Отметьте 3–5 мест в библиотеке и соберите первый.
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <ul className="list">
        {envelopes.map((envelope) => (
          <li key={envelope.id}>
            <article className="envelope">
              <div className="envelope__head">
                <StatusDot status={envelope.status} />
                <span className="caption">{formatDate(envelope.created_at)}</span>
              </div>

              {envelope.host_note && <p className="envelope__note">{envelope.host_note}</p>}

              <p className="envelope__places">
                {envelope.places.map((place) => place.name).join(' · ')}
              </p>

              {envelope.answer ? (
                <p className="envelope__answer">
                  Выбрали <b>{envelope.answer.chosen_place_name}</b>
                  {envelope.answer.guest_message ? ` — «${envelope.answer.guest_message}»` : ''}
                </p>
              ) : (
                <p className="envelope__link">{envelope.url}</p>
              )}
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
