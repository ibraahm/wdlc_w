import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';

// Audit is admin-only
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Get()
  list(
    @Query('entity') entity?: string,
    @Query('adminId') adminId?: string,
    @Query('agentId') agentId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.audit.list({
      entity,
      adminId,
      agentId,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }
}
