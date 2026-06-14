import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
@Controller('admin')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('dashboard/summary')
  summary() {
    return this.dashboard.summary();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.dashboard.search(q ?? '');
  }

  @Get('agent-profile/:ddFileId')
  async agentProfile(@Param('ddFileId') ddFileId: string) {
    const profile = await this.dashboard.agentProfile(ddFileId);
    if (!profile) throw new NotFoundException('Agent record not found');
    return profile;
  }
}
