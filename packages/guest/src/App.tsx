import { useEffect, useState } from 'react';
import type { InviteResponse } from '@invite/shared';
import { fetchInvite, tokenFromLocation, type LoadState } from './api.js';
import { InvitePage } from './InvitePage.js';
import { WaxSeal } from './components/WaxSeal.js';

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
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
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
  }, [token]);

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

  if (state.kind === 'not_found' || !token) {
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

  return <InvitePage token={token} invite={state.invite} onUpdate={updateInvite(setState)} />;
}

/** Ответ гостя меняет конверт локально — перезагружать страницу незачем. */
function updateInvite(setState: (next: LoadState) => void) {
  return (invite: InviteResponse) => setState({ kind: 'ready', invite });
}
