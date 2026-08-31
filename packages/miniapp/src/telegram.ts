/**
 * Доступ к Telegram Web App. Пакет-обёртку не берём: нам нужны три вещи —
 * initData, готовность и haptic. Всё остальное только добавило бы зависимость.
 */

interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function webApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

/**
 * Вне Telegram (локальная отладка) берём initData из переменной сборки.
 * В проде её нет, поэтому подделать личность так нельзя.
 */
export function initData(): string {
  const fromTelegram = webApp()?.initData;
  if (fromTelegram) return fromTelegram;
  return import.meta.env.DEV ? (import.meta.env.VITE_DEV_INIT_DATA ?? '') : '';
}

export function bootstrap(): void {
  const app = webApp();
  if (!app) return;
  app.ready();
  app.expand();
}

export function haptic(kind: 'tap' | 'success' | 'error'): void {
  const feedback = webApp()?.HapticFeedback;
  if (!feedback) return;
  if (kind === 'tap') feedback.impactOccurred('light');
  else feedback.notificationOccurred(kind === 'success' ? 'success' : 'error');
}
