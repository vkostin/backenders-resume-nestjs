import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { hasValidAdminToken } from './admin-token';

/** REST counterpart of AdminGuard: same X-Admin-Token contract, HTTP 401. */
@Injectable()
export class AdminHttpGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!hasValidAdminToken(context.switchToHttp().getRequest())) {
      throw new UnauthorizedException('Request requires a valid admin token');
    }
    return true;
  }
}
