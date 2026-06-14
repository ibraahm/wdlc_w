import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { UpdateApplicationStatusDto } from './dto/application.dto';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
@Controller('admin/agent-applications')
export class ApplicationsAdminController {
  constructor(private applications: ApplicationsService) {}

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.applications.listAll(status, user.id, user.role);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.applications.setStatus(id, dto.status, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.applications.remove(id, adminId);
  }
}
