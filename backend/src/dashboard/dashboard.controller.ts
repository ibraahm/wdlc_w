import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR', 'REGIONAL_OFFICER')
@Controller('admin')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('dashboard/summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(user.id, user.role);
  }

  @Get('search')
  search(@Query('q') q: string, @CurrentUser() user: AuthUser) {
    return this.dashboard.search(q ?? '', user.id, user.role);
  }

  @Get('agent-profile/:ddFileId')
  async agentProfile(@Param('ddFileId') ddFileId: string, @CurrentUser() user: AuthUser) {
    const profile = await this.dashboard.agentProfile(ddFileId, user.id, user.role);
    if (!profile) throw new NotFoundException('Agent record not found');
    return profile;
  }
}
