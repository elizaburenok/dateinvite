import { useEffect, useRef } from 'react';
import type { GuestPlace } from '@invite/shared';
import { PlaceCard } from '../PlaceCard.js';
import { usePrefersReducedMotion } from './useStackProgress.js';
import type { EnvelopeState } from './Envelope.js';

interface CardCycleProps {
  places: GuestPlace[];
  selected: string | null;
  readOnly: boolean;
  state: EnvelopeState;
  onSelect(id: string): void;
}

/** Сколько колода стоит на карточке, прежде чем переложить её назад. */
const HOLD_MS = 620;
/** Сколько длится само перекладывание. */
const MOVE_MS = 460;
const STEP_MS = HOLD_MS + MOVE_MS;
/**
 * Какую долю хода занимает подмена в конце — та, на которой уезжающая карточка
 * проскальзывает под переднюю (разбор у --veil в cycle.css). Доля маленькая
 * нарочно: это сглаживание стыка, а не отдельный эффект. Растянутая, она
 * превратилась бы в то самое растворение, от которого мы и ушли.
 */
const VEIL = 0.18;
/**
 * Ход идёт в два такта, и это главное, что отличает живую смену от ровного
 * сдвига: сперва уезжает передняя карточка, и только когда она почти освободила
 * место, колода одним коротким движением подтягивается вперёд. Пока оба такта
 * шли вместе, вся смена читалась одним движением — колода не подавалась вслед
 * за ушедшей карточкой, а просто переезжала целиком.
 *
 * Подтяг обязан уложиться в тот же шаг (PULL_DELAY_MS + PULL_MS === MOVE_MS):
 * доводка при остановке колоды доводит шаг до конца, и подтяг, торчащий за его
 * границу, она застала бы на полпути.
 */
const PULL_DELAY_MS = 160;
const PULL_MS = MOVE_MS - PULL_DELAY_MS;

/**
 * Стопка мест: компактная колода, которая сама перекладывается по кругу.
 *
 * Колода занимает высоту одной карточки плюс кромки соседей и целиком помещается
 * на экран — скролла здесь нет. Передняя карточка лежит ниже всех и видна
 * целиком, соседи выглядывают над ней полосами. Карточки сменяют друг друга
 * сами: передняя уходит наверх, за спины остальных, и они опускаются на одну
 * кромку. Ховера здесь нет намеренно — колода не ждёт курсора, а идёт всегда,
 * пока конверт открыт и место не выбрано.
 *
 * Ход шаговый, а не сплошной: колода стоит HOLD_MS на каждой карточке — её
 * успевают прочитать, — и за MOVE_MS перекладывает верхнюю. На паузе карточек
 * «в пути» нет вовсе, поэтому клик всегда попадает туда, куда человек целился.
 *
 * Сам ход — в два такта: уезжает передняя карточка, и следом, с задержкой,
 * колода подтягивается вперёд на её место (PULL_DELAY_MS).
 *
 * Все карточки одного размера: в глубину они уходят сдвигом и затемнением, а не
 * масштабом. Масштаб здесь не годится: уезжающая карточка едет поверх колоды, и,
 * уменьшаясь на ходу, она оказывалась бы меньше тех, что лежат позади неё, —
 * колода читалась бы вывернутой наизнанку.
 *
 * Ширина колоды в потоке — одна карточка; полосу кромок над передней карточкой
 * добирает CSS из --n, поэтому число мест ему нужно знать (мест бывает от трёх
 * до пяти).
 *
 * Всё состояние — одни часы `clock` в миллисекундах. Из них считаются оба такта
 * хода (`moveAt` и `pullAt`), а из них для каждой карточки — её глубина в колоде
 * `--d`: 0 впереди, 1, 2, … вглубь на кромку соседа. Раскладку по `--d` — сдвиг,
 * затемнение и растворение задней границы — дальше делает CSS, и мерить рост
 * карточки для этого не нужно: всё выражается в кромках.
 *
 * Часы гоняем через requestAnimationFrame и пишем прямо в стили, минуя состояние
 * React: перерисовывать дерево на каждый кадр ради одного трансформа незачем.
 */
export function CardCycle({ places, selected, readOnly, state, onSelect }: CardCycleProps) {
  const count = places.length;
  const dealt = state === 'dealing' || state === 'open';
  const reducedMotion = usePrefersReducedMotion();

  const deckRef = useRef<HTMLDivElement>(null);
  // Часы колоды. Замкнуты по всему кругу (count * STEP_MS), чтобы не расти
  // бесконечно: за круг колода возвращается в то же положение.
  const clock = useRef(0);

  // Выбранное место останавливает колоду: место читают, а не перебирают, и
  // уезжать из-под глаз карточка не должна. Соседей в этот момент не видно
  // (правила [data-focus] в cycle.css), так что перекладывать всё равно нечего.
  const focused = selected !== null && places.some((place) => place.id === selected);
  const running = dealt && !reducedMotion && count > 1 && !focused;

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const round = count * STEP_MS;
    // Насколько глубоко достаёт растворение задней границы — в кромках. Число
    // живёт в стилях (--cycle-haze), потому что это раскладка, а не поведение;
    // здесь оно нужно ровно затем, чтобы не вешать маску на карточки, до которых
    // растворение не дотягивается: маска обрезает тень, и платить ею за градиент,
    // который ничего не делает, незачем.
    const haze = parseFloat(getComputedStyle(deck).getPropertyValue('--cycle-haze')) || 0;

    const paint = () => {
      const step = Math.floor(clock.current / STEP_MS);
      const inStep = clock.current - step * STEP_MS;
      // Кого перекладывают на этом шаге: ту, что стояла впереди, когда шаг
      // начался. Раньше это выводилось из фазы — но тактов теперь два, и граница
      // между «лежит в колоде» и «в пути» у них разъехалась бы. Номер шага у
      // обоих тактов общий, и по нему она всегда одна.
      const moving = count > 1 && inStep > HOLD_MS ? step % count : -1;
      const u = moveAt(inStep);
      const pull = pullAt(inStep);
      const items = deck.querySelectorAll<HTMLElement>('.cycle__item');
      let front = 0;
      let nearest = Infinity;

      items.forEach((el, index) => {
        // Глубина в кромках: 0 — впереди, 1, 2, …, count-1 — в самом низу колоды.
        let d: number;
        if (index === moving) {
          // Уезжающая проходит за шаг весь путь от переднего места до последнего
          // слота — и едет поверх колоды: под ней она была бы наполовину закрыта
          // передней и читалась бы обрезком, а не карточкой.
          d = u * (count - 1);
          el.style.zIndex = '200';
          // Конец хода: заранее гасим ту часть карточки, которую после подмены
          // закроет передняя. К моменту подмены гасить уже нечего — картинка
          // до и после совпадает пиксель в пиксель, и стыка не видно.
          el.style.setProperty('--veil', clamp01((1 - u) / VEIL).toFixed(4));
          el.setAttribute('data-veil', '');
        } else {
          // Остальные лежат целыми кромками и за шаг подтягиваются ровно на одну.
          d = count > 1 ? (((index - step - pull) % count) + count) % count : 0;
          el.style.zIndex = String(Math.round(100 - d * 10));
          el.removeAttribute('data-veil');
          // Кликают переднюю из колоды, а не ту, что в пути: целятся в место,
          // а не в карточку, которая уже уезжает.
          if (d < nearest) {
            nearest = d;
            front = index;
          }
        }
        el.style.setProperty('--d', d.toFixed(4));
        // Задняя граница колоды растворена, и достаёт растворение только до
        // самых глубоких карточек — остальным маска не нужна. Колоде из одной
        // карточки не нужна вовсе: у неё нет задней границы, а верх этой
        // единственной карточки — её собственный край, а не дно стопки.
        if (count > 1 && d > count - 1 - haze) el.setAttribute('data-haze', '');
        else el.removeAttribute('data-haze');
      });

      items.forEach((el, index) => {
        if (index === front) el.setAttribute('data-front', '');
        else el.removeAttribute('data-front');
      });
    };

    paint();

    let raf = 0;

    if (running) {
      let last = performance.now();
      const run = (now: number) => {
        // Кадры не выдаются, когда вкладка в фоне: без потолка на dt колода
        // после возвращения прыгнула бы сразу на несколько карточек вперёд.
        clock.current = (clock.current + Math.min(now - last, 64)) % round;
        last = now;
        paint();
        raf = requestAnimationFrame(run);
      };
      raf = requestAnimationFrame(run);
      return () => cancelAnimationFrame(raf);
    }

    // Колода встала (выбрали место). На паузе она и так стоит ровно — вставать
    // никуда не надо.
    const step = Math.floor(clock.current / STEP_MS);
    const inStep = clock.current - step * STEP_MS;
    if (inStep <= HOLD_MS) {
      clock.current = step * STEP_MS;
      paint();
      return;
    }

    // Посреди перекладывания колода не встаёт колом: шаг доводится до конца и
    // уже там она замирает. Доводка считается от абсолютного времени, а не
    // покадрово: кадры не выдаются, когда вкладка в фоне, и покадровая доводка
    // там просто не дошла бы до конца — вернувшись, человек застал бы карточку
    // застывшей на полпути. Здесь же первый кадр после возвращения увидит, что
    // время вышло, и доложит её на место.
    const from = clock.current;
    const to = (step + 1) * STEP_MS;
    const started = performance.now();
    const finish = (now: number) => {
      // Часы идут своим темпом, поэтому и замедление к концу шага то же самое,
      // что было бы на ходу: его держат moveAt и pullAt, а не эта доводка.
      const k = Math.min(1, (now - started) / (to - from));
      clock.current = k >= 1 ? to % round : from + (to - from) * k;
      paint();
      if (k < 1) raf = requestAnimationFrame(finish);
    };
    raf = requestAnimationFrame(finish);
    return () => cancelAnimationFrame(raf);
  }, [running, count]);

  return (
    <div
      className="cycle"
      ref={deckRef}
      data-dealt={dealt || undefined}
      // Место выбрано — колода в фокусе: соседей не видно, выбранная крупнее.
      data-focus={focused || undefined}
      // Не меньше одного: на пустом списке (--n - 1) ушло бы в минус и колода
      // получила бы отрицательный отступ. Такого конверта не бывает, но ломаться
      // на вырожденных данных компонент всё равно не должен.
      style={{ '--n': Math.max(1, count) } as React.CSSProperties}
    >
      {/* Распорка задаёт колоде высоту одной карточки: сами карточки лежат
          абсолютно и в потоке ничего не занимают. */}
      <div className="cycle__sizer" aria-hidden="true" />

      {places.map((place, index) => (
        <div
          key={place.id}
          className="cycle__item"
          data-chosen={selected === place.id || undefined}
          // Начальное значение — чтобы до первого кадра колода уже лежала стопкой,
          // а не сваливалась в кучу. Дальше --d каждый кадр переписывает paint().
          style={{ '--d': index, '--i': index } as React.CSSProperties}
        >
          <div className="cycle__card">
            <PlaceCard
              place={place}
              selected={selected === place.id}
              readOnly={readOnly}
              onSelect={onSelect}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Первый такт — ход уезжающей карточки: 0 — она только тронулась с переднего
 * места, 1 — уже легла в последний слот.
 *
 * Шаг состоит из паузы и хода: пока идёт пауза, такт стоит на нуле и колода не
 * двигается вовсе. Ход разгоняется и тормозится с нулевой скоростью на концах,
 * поэтому карточка трогается и останавливается без рывка — а стыка между шагом
 * и паузой не видно, потому что в этих точках скорость и так ноль.
 */
function moveAt(inStep: number): number {
  const k = clamp01((inStep - HOLD_MS) / MOVE_MS);
  return k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
}

/**
 * Второй такт — подтяг колоды: 0 — она стоит там же, где стояла, 1 — переложила
 * ровно одну кромку.
 *
 * Трогается позже уезжающей карточки и идёт по другой кривой: с места быстро и
 * потом долго тормозит. Мягкого начала здесь быть не должно — колода не
 * переезжает вслед за карточкой, а подаётся вперёд, освободившись от неё, и
 * читается это ровно рывком в начале. Перелёта тоже нет: карточки лежат друг на
 * друге и трения между ними больше, чем пружины.
 */
function pullAt(inStep: number): number {
  const k = clamp01((inStep - HOLD_MS - PULL_DELAY_MS) / PULL_MS);
  return 1 - (1 - k) ** 3;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
