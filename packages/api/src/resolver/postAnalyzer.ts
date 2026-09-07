import Anthropic from '@anthropic-ai/sdk';
import { QUOTED_WEIGHT, type NameHint } from './textCandidates.js';

/**
 * LLM-разбор поста для ветки «только текст» — вариант §7, который эвристика не тянет.
 *
 * Зачем: человек часто пишет название слитно с локацией — «Забыли Сахар One Trinity
 * Place», где «Забыли Сахар» это сеть, а «One Trinity Place» — бизнес-центр. Такую
 * склейку OSM не находит целиком, а эвристика её не разделит: она не понимает слова.
 * Модель делит имя на искомое и заодно достаёт город, если он назван в тексте.
 *
 * Зовётся дорого и только по делу — резолвер обращается сюда лишь когда в посте нет
 * адреса (адрес надёжнее и дешевле любой догадки). Всё, что модель нашла, всё равно
 * уходит хосту как кандидаты, а не сохраняется молча как resolved (§3).
 */

export interface PostAnalysis {
  /** Названия заведения, очищенные и пригодные для поиска на карте, лучший первым. */
  names: NameHint[];
  /** Город, если он явно назван в тексте поста. Иначе null. */
  city: string | null;
}

export interface PostAnalyzer {
  analyze(text: string): Promise<PostAnalysis>;
}

const SYSTEM = `Ты извлекаешь из русского поста о городском заведении название места для поиска на карте.

Контекст: пост переслали в бот, который сохраняет места в библиотеку. Адреса (улицы с домом) в посте нет — иначе тебя бы не позвали. Твоя задача — вернуть название(я), по которым заведение реально найдётся в OpenStreetMap.

Правила:
- Отделяй название бренда/заведения от адреса, здания и бизнес-центра. «Забыли Сахар One Trinity Place» → название «Забыли Сахар» (One Trinity Place — это бизнес-центр, не часть имени).
- Короткое искомое имя сети или заведения ставь первым. Полное написание, как в посте, можешь добавить вторым вариантом.
- Не выдумывай. Если названия заведения в тексте нет — верни пустой список names.
- Максимум 3 варианта, самый вероятный первым.
- city — только если город прямо назван в тексте (Москва, Санкт-Петербург, СПб и т.п.). Иначе пустая строка. Не додумывай город по названию улицы или заведения.
- Отвечай ровно одним вызовом инструмента places.`;

const TOOL: Anthropic.Tool = {
  name: 'places',
  description: 'Названия заведения для поиска на карте и город, если он назван в тексте',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      names: {
        type: 'array',
        description: 'Названия заведения, очищенные для поиска, лучший первым',
        items: { type: 'string' },
      },
      city: {
        type: 'string',
        description: 'Город из текста поста или пустая строка, если он не назван',
      },
    },
    required: ['names', 'city'],
    additionalProperties: false,
  },
};

interface ToolInput {
  names?: string[];
  city?: string;
}

export interface ClaudePostAnalyzerOptions {
  apiKey: string;
  model?: string;
  client?: Anthropic;
}

const MAX_NAMES = 3;

/** Пустой разбор: модель ничего не нашла или её не позвали. */
const EMPTY: PostAnalysis = { names: [], city: null };

export function createClaudePostAnalyzer(options: ClaudePostAnalyzerOptions): PostAnalyzer {
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey });

  return {
    async analyze(text) {
      const trimmed = text.trim();
      if (!trimmed) return EMPTY;

      const response = await client.messages.create({
        model: options.model ?? 'claude-opus-5',
        max_tokens: 1000,
        // Задача короткая и разборная — низкий effort экономит токены, не теряя качества.
        output_config: { effort: 'low' },
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'places' },
        messages: [{ role: 'user', content: trimmed }],
      });

      for (const block of response.content) {
        if (block.type !== 'tool_use' || block.name !== 'places') continue;
        const input = block.input as ToolInput;
        const names = (input.names ?? [])
          .map((name) => name.trim())
          .filter((name) => name.length >= 2 && name.length <= 60)
          .slice(0, MAX_NAMES)
          // Вычлененное моделью имя приравниваем к размеченному человеком: по нему
          // ищем наравне с кавычками и ссылкой, а не как по слабой догадке.
          .map((name): NameHint => ({ text: name, weight: QUOTED_WEIGHT }));
        const city = input.city?.trim() || null;
        return { names, city };
      }

      return EMPTY;
    },
  };
}
