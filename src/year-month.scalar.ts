import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import {
  formatYearMonth,
  InvalidYearMonthError,
  parseYearMonth,
} from './year-month';

@Scalar('YearMonth', () => YearMonthScalar)
export class YearMonthScalar implements CustomScalar<string, Date> {
  description = 'Year and month (YYYY-MM)';

  parseValue(value: unknown): Date {
    return parseYearMonth(value);
  }

  serialize(value: unknown): string {
    return formatYearMonth(value);
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind !== Kind.STRING) {
      throw new InvalidYearMonthError();
    }
    return parseYearMonth(ast.value);
  }
}
