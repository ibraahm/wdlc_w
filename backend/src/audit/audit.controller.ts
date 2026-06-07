import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Get()
  list(
    @Query('entity') entity?: string,
    @Query('actorId') actorId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.audit.list({
      entity,
      actorId,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }
}
