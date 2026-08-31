/** Доменная ошибка с кодом: роут переводит её в HTTP-статус, домен про HTTP не знает. */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const notFound = (message: string) => new DomainError('not_found', message, 404);
export const badRequest = (code: string, message: string) => new DomainError(code, message, 400);
export const gone = (code: string, message: string) => new DomainError(code, message, 410);
