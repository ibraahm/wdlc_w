import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AgentsService } from './agents.service';
import { AdminAgentStatusDto, AdminAgentVisibilityDto } from './dto/agent-profile.dto';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Admin management of agents: review status and force-control map visibility.
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
@Controller('admin/agents')
export class AgentsAdminController {
  constructor(private agents: AgentsService) {}

  @Get()
  list() {
    return this.agents.listAllForAdmin();
  }

  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: AdminAgentStatusDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.agents.setStatus(id, dto.status, adminId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch(':id/visibility')
  setVisibility(
    @Param('id') id: string,
    @Body() dto: AdminAgentVisibilityDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.agents.setVisibility(id, dto.showOnMap ?? false, adminId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
