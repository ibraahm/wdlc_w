import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DDService } from './dd.service';
import {
  CreateDDFileDto,
  UpdateDocumentDto,
  SetStageDto,
  SetRiskDto,
  RecordReviewDto,
} from './dto/dd.dto';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
@Controller('admin/agent-dd')
export class DDAdminController {
  constructor(private dd: DDService) {}

  @Get()
  list(@Query('stage') stage?: string) {
    return this.dd.list(stage);
  }

  @Get('dashboard')
  dashboard() {
    return this.dd.attentionDashboard();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.dd.get(id);
  }

  @Post()
  create(@Body() dto: CreateDDFileDto, @CurrentUser('id') adminId: string) {
    return this.dd.createFile(dto, adminId);
  }

  @Patch(':id/documents/:code')
  updateDocument(
    @Param('id') id: string,
    @Param('code') code: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.dd.updateDocument(id, code, dto, adminId);
  }

  @Post(':id/recompute')
  recompute(@Param('id') id: string) {
    return this.dd.recomputeStatuses(id);
  }

  @Patch(':id/stage')
  setStage(@Param('id') id: string, @Body() dto: SetStageDto, @CurrentUser('id') adminId: string) {
    return this.dd.setStage(id, dto, adminId);
  }

  @Patch(':id/risk')
  setRisk(@Param('id') id: string, @Body() dto: SetRiskDto, @CurrentUser('id') adminId: string) {
    return this.dd.setRisk(id, dto, adminId);
  }

  @Patch(':id/review')
  recordReview(@Param('id') id: string, @Body() dto: RecordReviewDto, @CurrentUser('id') adminId: string) {
    return this.dd.recordReview(id, dto, adminId);
  }
}
