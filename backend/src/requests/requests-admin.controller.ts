import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { RequestsService } from './requests.service';

const STATUSES = ['OPEN', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CLOSED'];

class UpdateRequestDto {
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsString() @MaxLength(120) assignee?: string;
}
class MessageDto {
  @IsString() @MaxLength(5000) body: string;
}

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
@Controller('admin/requests')
export class RequestsAdminController {
  constructor(private requests: RequestsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.requests.listForOffice(user.id, user.role, status);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.getForOffice(user.id, user.role, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRequestDto) {
    return this.requests.updateForOffice(user.id, user.role, id, dto);
  }

  @Post(':id/messages')
  message(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MessageDto) {
    return this.requests.officeMessage(user.id, user.role, id, dto.body, user.name);
  }
}
