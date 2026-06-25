import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemService } from './system.service';

// SUPER_ADMIN only — exposes a non-secret configuration/health report.
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin/system')
export class SystemController {
  constructor(private system: SystemService) {}

  @Get('status')
  status() {
    return this.system.status();
  }
}
