import type { EnvelopeStatus } from '@invite/shared';

const LABELS: Record<EnvelopeStatus, string> = {
  draft: 'draft',
  sent: 'sent',
  opened: 'opened',
  answered: 'answered',
  expired: 'expired',
};

export function StatusDot({ status }: { status: EnvelopeStatus }) {
  return (
    <span className={`status status--${status}`}>
      <span className="status__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
