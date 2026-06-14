import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RegionalService } from './regional.service';

class UpsertOfficeDto {
  @IsOptional() @IsString() @MaxLength(20) code?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(400) states?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('admin/regional-offices')
export class RegionalAdminController {
  constructor(private regional: RegionalService) {}

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Get()
  list() {
    return this.regional.list();
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Post()
  create(@Body() dto: UpsertOfficeDto, @CurrentUser('id') adminId: string) {
    return this.regional.create(dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertOfficeDto, @CurrentUser('id') adminId: string) {
    return this.regional.update(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.regional.remove(id, adminId);
  }
}
