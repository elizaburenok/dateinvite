import { useEffect, useState } from 'react';
import type { InviteResponse } from '@invite/shared';
import { fetchInvite, sendAnswer, tokenFromLocation, type LoadState } from './api.js';
import { InvitePage } from './InvitePage.js';
import { WaxSeal } from './components/WaxSeal.js';
import { DEMO_INVITE, isDemo } from './demo/fixture.js';
import { entryFromLocation } from './entry.js';

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="page page--center">
      <div className="notice">
        <WaxSeal size={52} />
        <h1 className="notice__title">{title}</h1>
        <p className="notice__text">{text}</p>
      </div>
    </main>
  );
}

export function App() {
  const token = tokenFromLocation();
  const demo = isDemo();
  const entry = entryFromLocation();
  const [state, setState] = useState<LoadState>(
    demo ? { kind: 'ready', invite: DEMO_INVITE } : { kind: 'loading' },
  );
  useEffect(() => {
    if (demo) return;
    if (!token) {
      setState({ kind: 'not_found' });
      return;
    }
    let cancelled = false;
    fetchInvite(token).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [token, demo]);

  // Ничего не показываем, пока приглашение грузится: экран «Открываем
  // конверт…» с сургучной печатью — от прежней версии страницы, до кучки и
  // колоды. На новом входе он читался чужой, наспех вставленной картинкой на
  // первом кадре. Фон держит .page--center, монтируется страница мгновенно
  // после ответа сервера — заменять печать нечем.
  if (state.kind === 'loading') {
    return <main className="page page--center" />;
  }

  if (state.kind === 'not_found') {
    return (
      <Message
        title="Такого приглашения нет"
        text="Возможно, ссылку скопировали не полностью. Попросите отправить её ещё раз."
      />
    );
  }

  if (state.kind === 'error') {
    return <Message title="Не открылось" text={state.message} />;
  }

  return (
    <InvitePage
      invite={state.invite}
      entry={entry}
      onSubmit={demo ? answerLocally : (placeId, message) => sendAnswer(token!, placeId, message)}
      onUpdate={updateInvite(setState)}
    />
  );
}

/** В демо-режиме бэкенда нет, но экран «ответ отправлен» посмотреть надо. */
async function answerLocally(chosenPlaceId: string, message: string | null) {
  return { chosen_place_id: chosenPlaceId, message, answered_at: new Date().toISOString() };
}

/** Ответ гостя меняет конверт локально — перезагружать страницу незачем. */
function updateInvite(setState: (next: LoadState) => void) {
  return (invite: InviteResponse) => setState({ kind: 'ready', invite });
}
