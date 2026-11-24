import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { GqlExecutionContext } from '@nestjs/graphql';
import { hasValidAdminToken } from './admin-token';

/** GraphQL guard: mutations require a valid X-Admin-Token. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = GqlExecutionContext.create(context).getContext().req;
    if (!hasValidAdminToken(req)) {
      throw new GraphQLError('Mutation requires a valid admin token', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return true;
  }
}
