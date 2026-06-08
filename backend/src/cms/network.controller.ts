import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { NetworkService, CreateNetworkCountryDto, UpdateNetworkCountryDto } from './network.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard)
@Controller('cms/network')
export class NetworkController {
  constructor(private network: NetworkService) {}

  @Public()
  @Get()
  list() { return this.network.listPublic(); }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('admin')
  listAll() { return this.network.listAll(); }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Post()
  create(@Body() dto: CreateNetworkCountryDto, @CurrentUser() user: AuthUser) {
    return this.network.create(dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNetworkCountryDto, @CurrentUser() user: AuthUser) {
    return this.network.update(id, dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.network.remove(id, user.id);
  }
}
