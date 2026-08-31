import type { EnvelopeStatus } from '@invite/shared';

const LABELS: Record<EnvelopeStatus, string> = {
  draft: 'черновик',
  sent: 'отправлено',
  opened: 'посмотрели',
  answered: 'ответили',
  expired: 'истекло',
};

export function StatusDot({ status }: { status: EnvelopeStatus }) {
  return (
    <span className={`status status--${status}`}>
      <span className="status__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
