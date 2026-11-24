const YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const MESSAGE = 'YearMonth must be YYYY-MM';

/** Raised for any malformed or out-of-range YYYY-MM value. */
export class InvalidYearMonthError extends Error {
  constructor(message = MESSAGE) {
    super(message);
    this.name = 'InvalidYearMonthError';
  }
}

export function formatYearMonth(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new InvalidYearMonthError();
    }
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  if (isYearMonth(value)) {
    return value;
  }
  throw new InvalidYearMonthError();
}

export function parseYearMonth(value: unknown): Date {
  if (!isYearMonth(value)) {
    throw new InvalidYearMonthError();
  }
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

/** YYYY-MM with month 01..12 and year 1900..2200. */
export function isYearMonth(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const match = YEAR_MONTH_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 && year >= 1900 && year <= 2200;
}
