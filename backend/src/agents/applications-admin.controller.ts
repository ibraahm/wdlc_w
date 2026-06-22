import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { UpdateApplicationStatusDto, UpdateApplicationAddressDto } from './dto/application.dto';
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
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('archived') archived?: string,
  ) {
    return this.applications.listAll(status, user.id, user.role, archived === 'true');
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

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch(':id/address')
  updateAddress(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationAddressDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.applications.updateAddress(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.applications.archive(id, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.applications.unarchive(id, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.applications.remove(id, adminId);
  }

  // Permanent removal incl. an empty linked DD file. SUPER_ADMIN only; the
  // service refuses if any evidence has been collected.
  @Roles('SUPER_ADMIN')
  @Delete(':id/force')
  forceRemove(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.applications.forceRemove(id, adminId);
  }
}
