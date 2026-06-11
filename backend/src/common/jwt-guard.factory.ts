import { CanActivate, ExecutionContext, Injectable, Type, mixin } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

/**
 * Builds a Passport JWT guard for the given strategy that also honours the
 * @Public() decorator. Replaces the previously duplicated per-portal guards.
 */
export function createJwtAuthGuard(strategy: string): Type<CanActivate> {
  @Injectable()
  class JwtAuthGuardMixin extends AuthGuard(strategy) {
    constructor(readonly reflector: Reflector) {
      super();
    }

    canActivate(context: ExecutionContext) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) return true;
      return super.canActivate(context);
    }
  }

  return mixin(JwtAuthGuardMixin);
}
