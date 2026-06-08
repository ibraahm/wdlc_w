import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { UpdateApplicationStatusDto } from './dto/application.dto';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
@Controller('admin/agent-applications')
export class ApplicationsAdminController {
  constructor(private applications: ApplicationsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.applications.listAll(status);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.applications.setStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applications.remove(id);
  }
}
