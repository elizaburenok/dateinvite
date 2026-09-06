import Anthropic from '@anthropic-ai/sdk';

/**
 * Перевод названий, адресов и районов через Claude.
 *
 * Транслит один не справляется с описательными названиями: «Цветочная лавка»
 * должна стать Flower Shop, а «Бергамот» — Bergamot, и различить эти два случая
 * может только тот, кто понимает слова. Поэтому здесь модель, а транслит остаётся
 * запасным вариантом на случай, когда ключа или сети нет.
 *
 * Вызов один на место и происходит при сохранении, а не при показе: страница-конверт
 * обязана быть снапшотом и во внешние сервисы не ходит (§3).
 */

export type TranslationKind = 'name' | 'address' | 'district';

export interface TranslationRequest {
  kind: TranslationKind;
  source: string;
  /** Город хоста — подсказка, в каком городе искать общепринятое английское имя. */
  city?: string | null;
}

const SYSTEM = `Ты переводишь на английский язык названия мест, адреса и районы из русских постов о городских заведениях.

Правила:
- Название заведения: если у места есть общепринятое английское написание — используй его. Описательное название переводится по смыслу («Цветочная лавка» → «Flower Shop»). Имя собственное или выдуманное слово транслитерируется по BGN/PCGN («Бергамот» → «Bergamot», «Щукин» → «Shchukin»).
- Адрес: английский порядок, номер дома перед улицей. Тип улицы переводится (улица → Street, переулок → Lane, проспект → Avenue, набережная → Embankment, шоссе → Highway, площадь → Square). Название улицы транслитерируется. У города берётся общепринятое английское имя (Москва → Moscow, Санкт-Петербург → Saint Petersburg).
- Район: транслитерация, без слова «district».
- Ничего не добавляй от себя: не дописывай город, страну, индекс или тип заведения, которых нет в исходной строке.
- Если строка уже на английском — верни её без изменений.
- Отвечай ровно одним вызовом инструмента translations, по одному элементу на каждую входную строку, сохраняя индексы.`;

const TOOL: Anthropic.Tool = {
  name: 'translations',
  description: 'Переводы входных строк на английский, по одному на каждый индекс',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer' },
            english: { type: 'string' },
          },
          required: ['index', 'english'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};

interface ToolInput {
  items: { index: number; english: string }[];
}

export interface ClaudeTranslatorOptions {
  apiKey: string;
  model?: string;
  client?: Anthropic;
}

const KIND_LABEL: Record<TranslationKind, string> = {
  name: 'название места',
  address: 'адрес',
  district: 'район',
};

/**
 * Переводит пачку строк одним запросом. Возвращает перевод по индексу входного
 * массива; пропущенные моделью элементы остаются undefined — вызывающий код
 * подставит транслит, а не молчание.
 */
export async function translateWithClaude(
  requests: TranslationRequest[],
  options: ClaudeTranslatorOptions,
): Promise<(string | undefined)[]> {
  if (requests.length === 0) return [];

  const client = options.client ?? new Anthropic({ apiKey: options.apiKey });
  const lines = requests
    .map((request, index) => {
      const city = request.city ? `, город: ${request.city}` : '';
      return `${index}. [${KIND_LABEL[request.kind]}${city}] ${request.source}`;
    })
    .join('\n');

  const response = await client.messages.create({
    model: options.model ?? 'claude-opus-5',
    max_tokens: 4000,
    // Задача короткая и словарная — низкий effort экономит токены, не теряя качества.
    output_config: { effort: 'low' },
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'translations' },
    messages: [{ role: 'user', content: lines }],
  });

  const result: (string | undefined)[] = new Array(requests.length).fill(undefined);
  for (const block of response.content) {
    if (block.type !== 'tool_use' || block.name !== 'translations') continue;
    // Экранирование в аргументах инструмента бывает разным — только JSON-разбор.
    const input = block.input as ToolInput;
    for (const item of input.items ?? []) {
      const english = item.english?.trim();
      if (english && item.index >= 0 && item.index < requests.length) {
        result[item.index] = english;
      }
    }
  }
  return result;
}
