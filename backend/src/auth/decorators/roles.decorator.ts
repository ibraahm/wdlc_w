import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** Restricts a route to the listed role strings. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
