import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { RiskService } from './risk.service';

class CreateRiskDto {
  @IsArray() factors: { key: string; label?: string; rating: number }[];
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
@Controller('admin/agent-dd/:id/risk-assessments')
export class RiskController {
  constructor(private risk: RiskService) {}

  @Get()
  list(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.risk.listForFile(id, user.id, user.role);
  }

  @Post()
  create(@Param('id') id: string, @Body() dto: CreateRiskDto, @CurrentUser() user: AuthUser) {
    return this.risk.create(id, dto, user.id, user.role);
  }
}
