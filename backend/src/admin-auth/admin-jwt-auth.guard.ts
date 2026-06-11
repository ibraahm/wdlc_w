import { createJwtAuthGuard } from '../common/jwt-guard.factory';

// Honours @Public(); rejects anything without a valid admin-portal JWT.
export const AdminJwtAuthGuard = createJwtAuthGuard('admin-jwt');
