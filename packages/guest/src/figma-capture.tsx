import { createRoot } from 'react-dom/client';
import type { InviteResponse } from '@invite/shared';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import './styles/wallpaper.css';
import './styles/fonts.css';
import './styles/invite.css';
import './styles/note.css';
import './styles/envelope.css';
import './styles/cycle.css';
import './styles/wheel.css';
import './styles/pile.css';
import './styles/selected-place.css';
import './styles/invitation-intro.css';
import { InvitePage } from './InvitePage.js';
import { DEMO_INVITE } from './demo/fixture.js';

const screen = new URLSearchParams(location.search).get('screen') ?? 'intro';
document.documentElement.dataset.screen = screen;
const invite: InviteResponse = screen === 'done'
  ? { ...DEMO_INVITE, status: 'answered', answer: { chosen_place_id: 'demo-1', message: null, answered_at: new Date().toISOString() } }
  : DEMO_INVITE;

createRoot(document.getElementById('root')!).render(
  <InvitePage invite={invite} entry="card" onSubmit={async () => ({
    chosen_place_id: 'demo-1', message: null, answered_at: new Date().toISOString(),
  })} onUpdate={() => {}} />,
);

if (screen === 'browse' || screen === 'selected') {
  window.setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })), 250);
}
if (screen === 'selected') {
  window.setTimeout(() => document.querySelector<HTMLElement>('.wheel')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), 3000);
}
