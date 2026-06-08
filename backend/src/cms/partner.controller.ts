import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PartnerService } from './partner.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('cms/partners')
export class PartnerController {
  constructor(private partners: PartnerService) {}

  @Public()
  @Get()
  listPublic() {
    return this.partners.listPublic();
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('admin')
  listAll() {
    return this.partners.listAll();
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Post()
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: AuthUser) {
    return this.partners.create(dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto, @CurrentUser() user: AuthUser) {
    return this.partners.update(id, dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.partners.remove(id, user.id);
  }
}
