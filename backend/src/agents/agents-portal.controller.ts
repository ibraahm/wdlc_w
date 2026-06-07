import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AgentsService } from './agents.service';
import { UpdateAgentProfileDto } from './dto/agent-profile.dto';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Agent self-service: manage your own public locator listing.
@UseGuards(PortalJwtAuthGuard)
@Controller('portal/profile')
export class AgentsPortalController {
  constructor(private agents: AgentsService) {}

  @Get()
  getProfile(@CurrentUser('id') agentId: string) {
    return this.agents.getMyProfile(agentId);
  }

  @Patch()
  updateProfile(
    @CurrentUser('id') agentId: string,
    @Body() dto: UpdateAgentProfileDto,
    @Req() req: Request,
  ) {
    return this.agents.updateMyProfile(agentId, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
