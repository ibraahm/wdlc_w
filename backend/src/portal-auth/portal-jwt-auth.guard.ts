import { createJwtAuthGuard } from '../common/jwt-guard.factory';

// Honours @Public(); rejects anything without a valid agent-portal JWT.
export const PortalJwtAuthGuard = createJwtAuthGuard('portal-jwt');
