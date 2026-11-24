import { GraphQLError } from 'graphql';
import { PortfolioError } from '../persistence/ports';
import { InvalidYearMonthError } from '../year-month';

/** Converts domain errors into GraphQL errors with stable codes. */
export function toGraphQLError(error: unknown): never {
  if (error instanceof PortfolioError) {
    throw new GraphQLError(error.message, {
      extensions: { code: error.code },
    });
  }
  if (error instanceof InvalidYearMonthError) {
    throw badUserInput(error.message);
  }
  throw error;
}

export async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    toGraphQLError(error);
  }
}

export function badUserInput(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

export function noProfile(): GraphQLError {
  return new GraphQLError('No profile in the database. Run the seed first.', {
    extensions: { code: 'NOT_FOUND' },
  });
}
