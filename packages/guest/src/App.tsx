import { useEffect, useState } from 'react';
import type { InviteResponse } from '@invite/shared';
import { fetchInvite, sendAnswer, tokenFromLocation, type LoadState } from './api.js';
import { InvitePage } from './InvitePage.js';
import { WaxSeal } from './components/WaxSeal.js';
import { DEMO_INVITE, isDemo } from './demo/fixture.js';
import { VariantSwitch, stackVariant } from './demo/variant.js';

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

  if (state.kind === 'loading') {
    return (
      <main className="page page--center">
        <div className="notice notice--quiet">
          <WaxSeal size={52} />
          <p className="notice__text">Открываем конверт…</p>
        </div>
      </main>
    );
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

  // Вариант стопки выбирается только в демо: боевая страница всегда основная.
  const variant = demo ? stackVariant() : 'cycle';

  return (
    <>
      <InvitePage
        invite={state.invite}
        onSubmit={demo ? answerLocally : (placeId, message) => sendAnswer(token!, placeId, message)}
        onUpdate={updateInvite(setState)}
        variant={variant}
      />
      {demo && <VariantSwitch current={variant} />}
    </>
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
