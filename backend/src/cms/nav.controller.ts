import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NavService } from './nav.service';
import { CreateNavItemDto, UpdateNavItemDto } from './dto/nav.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class ReorderItemDto {
  @IsString() id: string;
  @IsInt() order: number;
}
class ReorderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('cms/nav')
export class NavController {
  constructor(private nav: NavService) {}

  @Public()
  @Get()
  tree(@Query('location') location?: string) {
    return this.nav.tree(location);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Post()
  create(@Body() dto: CreateNavItemDto, @CurrentUser() user: AuthUser) {
    return this.nav.create(dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch('reorder')
  reorder(@Body() dto: ReorderDto, @CurrentUser() user: AuthUser) {
    return this.nav.reorder(dto.items, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNavItemDto, @CurrentUser() user: AuthUser) {
    return this.nav.update(id, dto, user.id);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.nav.remove(id, user.id);
  }
}
