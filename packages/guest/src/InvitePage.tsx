import { useEffect, useRef, useState } from 'react';
import type { AnswerResponse, InviteResponse } from '@invite/shared';
import { AnswerError } from './api.js';
import resultUrl from './assets/result.svg';
import { LensFilter } from './components/LensFilter.js';
import { NoteComposer } from './components/NoteComposer.js';
import { SelectedPlace } from './components/SelectedPlace.js';
import { CardWheel } from './components/envelope/CardWheel.js';
import { Envelope, useEnvelopeOpening } from './components/envelope/Envelope.js';
import { Pile, usePileReveal } from './components/pile/Pile.js';
import { usePrefersReducedMotion } from './components/envelope/usePrefersReducedMotion.js';
import type { Entry } from './entry.js';

/**
 * Сколько держится сворачивание выбранной карточки. Близнец --dur-close в
 * wheel.css (@keyframes wheel-card-close): по нему живёт флаг data-closing, под
 * которым играет обратная пружина. Меняешь там — поправь и здесь.
 */
const CLOSE_MS = 820;

interface InvitePageProps {
  invite: InviteResponse;
  /** Чем открывается приглашение: кучкой мини-превью или конвертом. */
  entry: Entry;
  /** Отправку внедряет App: у демо-режима она своя, без бэкенда. */
  onSubmit(chosenPlaceId: string, message: string | null): Promise<AnswerResponse>;
  onUpdate(invite: InviteResponse): void;
}

export function InvitePage({ invite, entry, onSubmit, onUpdate }: InvitePageProps) {
  const answered = invite.answer !== null;
  const expired = invite.status === 'expired';
  const readOnly = answered || expired;
  const reducedMotion = usePrefersReducedMotion();

  const [selected, setSelected] = useState<string | null>(invite.answer?.chosen_place_id ?? null);
  const selectedPlace = invite.places.find((place) => place.id === selected);
  // Заметка необязательна: пустую отправка превращает в null. Готовые фразы,
  // которыми она набирается в один тап, живут в самом поле (NoteComposer).
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Миниатюра выбранного места открывает поле ответа; отправляет его только Send.
  const [composing, setComposing] = useState(false);
  // Идёт сворачивание выбранной карточки: выбор уже снят (сцена расходится назад
  // в барабан), но такт обратной пружины ещё играет. Флаг живёт CLOSE_MS и вешает
  // data-closing на .reveal — под ним карточка «сужается» (wheel.css).
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Истёкшее приглашение и просьбу не анимировать открываем сразу: в первом
  // случае распечатывать нечего, во втором человек попросил не двигать интерфейс.
  //
  // Хук у каждого входа свой, и зовут их оба: условных хуков не бывает. Тот, что
  // сейчас не выбран, получает autoOpen и сразу садится в 'open' — он не держит
  // таймеров и ничего не считает, пока его не позовут.
  const skip = readOnly || reducedMotion;
  const envelope = useEnvelopeOpening(entry !== 'envelope' || skip, invite.places.length);
  const pile = usePileReveal(entry !== 'pile' || skip);
  const { state, open } = entry === 'envelope' ? envelope : pile;
  // Снятие выбора через сворачивание: выбор убираем сразу (сцена и поле заметки
  // расходятся назад), а на такт закрытия поднимаем флаг closing — под ним
  // карточка доигрывает обратную пружину (wheel.css). Прежний таймер сбрасываем:
  // быстрое закрыл-открыл-закрыл не должно оборвать флаг досрочно.
  function close() {
    setSelected(null);
    setComposing(false);
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setClosing(false), CLOSE_MS);
  }

  // Повторный клик по уже выбранному месту снимает выбор — тогда нижняя панель
  // прячется, и можно передумать, не выбирая другую карточку.
  function toggle(id: string) {
    if (selected === id) {
      close();
      return;
    }
    setSelected(id);
    // Новый выбор начинается с заметки автора и миниатюры-кнопки.
    setComposing(false);
  }

  // Таймер флага закрытия не должен пережить размонтирование.
  useEffect(() => () => clearTimeout(closeTimer.current), []);

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

  if (answered) {
    return (
      <main className="page">
        <header className="done">
          {/* Ответная надпись «Looks good. Can't wait to see you» живёт здесь, а
              не в момент выбора: пока место только выбрано и заметка ещё пишется,
              ответить хосту нечем — ответ появляется, когда он отправлен. Та же
              рисованная надпись, что и вопрос в шапке (assets/result.svg). */}
          <img
            className="done__lettering"
            src={resultUrl}
            alt="Looks good. Can't wait to see you"
          />
        </header>

        <p className="attribution">Данные о местах — © участники OpenStreetMap</p>
      </main>
    );
  }

  // Голый экран: до тапа на кучке не видно ничего, кроме неё самой.
  //
  // Признак снимается в момент тапа, но раскладку он больше не меняет: шапка и
  // подпись скрыты видимостью, а место занимают всегда (разбор в invite.css).
  // Прыжка по вертикали в первый кадр после нажатия поэтому нет — прятать под
  // замутнение или уводить в середину роста больше нечего.
  //
  // Шапка при этом появляется по-прежнему вместе с ростом: её проявление ждёт
  // своей очереди задержкой (--pile-lead в invite.css), а не этим признаком.
  const bare = entry === 'pile' && state === 'sealed';

  // Выбранное место показывает заметку автора и миниатюру для перехода к ответу.
  const picking = selected !== null && !readOnly;

  return (
    <main
      className="page"
      data-variant={entry}
      data-bare={bare || undefined}
      data-picking={picking || undefined}
    >
      <LensFilter />

      <header className="hero" />
      {bare && (!new URLSearchParams(window.location.search).get('caption') ||
        new URLSearchParams(window.location.search).get('caption') === 'top-left-text') && (
        <div className="page-invitation">
          <p className="page-invitation__lead">I’d like to meet<br />with you</p>
          <p className="page-invitation__detail">This invitation has some places to choose from</p>
        </div>
      )}

      <section
        className="reveal"
        data-state={state}
        data-variant={entry}
        data-closing={closing || undefined}
        /*
         * Размер колоды нужен самой сцене, а не только колоде: по нему кучка
         * считает свою высоту в уменьшенном виде и ставит мишень с глифом ровно
         * на верхнюю карточку. Колода объявляет его же у себя — она умеет
         * работать и вне этой сцены.
         */
        style={{ '--n': Math.max(1, invite.places.length) } as React.CSSProperties}
      >
        <div hidden={picking}>
          {entry === 'envelope' ? (
            <Envelope state={state} onOpen={open} />
          ) : (
            // Кучка живёт ровно свой такт — до конца дымки, — и уходит, не
            // дожидаясь конца роста.
            //
            // Раньше она досиживала до 'open', и это стоило верхней карточке
            // отдельного, ни с чем не связанного вздрагивания в самом конце.
            // Виден там уже не блюр: к концу такта и замутнение, и пелена, и
            // мишень стоят на нуле. Виден снос слоя. Замутнение — backdrop-filter
            // (.pile__haze), а он и с нулевым радиусом снимает подложку в
            // отдельную поверхность; убирается слой — карточка растеризуется
            // заново. Пока это происходило после роста, рябь приходилась на
            // остановившуюся картинку, где её ни с чем не спутать.
            //
            // Теперь тот же снос приходится на границу тактов: движение только
            // начинается, и прятать его больше ни во что не нужно.
            (state === 'sealed' || state === 'unsealing') && <Pile state={state} onOpen={open} />
          )}
          <CardWheel
            places={invite.places}
            selected={selected}
            readOnly={readOnly}
            state={state}
            onSelect={toggle}
          />
        </div>

        {picking && selectedPlace && (
          <SelectedPlace
            place={selectedPlace}
            composing={composing}
            onCompose={() => setComposing(true)}
            onBack={close}
          />
        )}

        {/* Поле ответа раскрывается после нажатия на миниатюру выбранного места. */}
        {!readOnly && (
          <NoteComposer
            value={message}
            open={picking && composing}
            sending={sending}
            error={error}
            onChange={setMessage}
            onSubmit={submit}
          />
        )}
      </section>

      <p className="attribution">Данные о местах — © участники OpenStreetMap</p>

    </main>
  );
}
