import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DDService } from './dd.service';
import {
  CreateDDFileDto,
  UpdateDocumentDto,
  SetStageDto,
  SetRiskDto,
  RecordReviewDto, SetBranchCodeDto,
  AddSignatureDocDto, UpdateSignatureDocDto,
} from './dto/dd.dto';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
@Controller('admin/agent-dd')
export class DDAdminController {
  constructor(private dd: DDService) {}

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('stage') stage?: string) {
    return this.dd.list(stage, user.id, user.role);
  }

  @Get('dashboard')
  dashboard() {
    return this.dd.attentionDashboard();
  }

  @Get('branches')
  branches() {
    return this.dd.listActiveBranches();
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.dd.get(id, user.id, user.role);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
  @Get(':id/pdf')
  async exportPdf(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const by = (user as any).name || (user as any).email || user.id;
    const { pdf, filename } = await this.dd.exportFilePdf(id, by, user.id, user.role);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
  @Get(':id/application.pdf')
  async exportApplicationPdf(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const { pdf, filename } = await this.dd.exportApplicationPdf(id, user.id, user.role);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Post('users/:userId/resend-setup')
  resendSetup(@Param('userId') userId: string, @CurrentUser('id') adminId: string) {
    return this.dd.resendPortalSetup(userId, adminId);
  }

  @Post('users/:userId/verify')
  verifyUser(@Param('userId') userId: string, @CurrentUser('id') adminId: string) {
    return this.dd.verifyPortalUser(userId, adminId);
  }

  @Post('users/:userId/generate-password')
  generatePassword(@Param('userId') userId: string, @CurrentUser('id') adminId: string) {
    return this.dd.generatePortalPassword(userId, adminId);
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

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
@Patch(':id/branch-code')
  setBranchCode(@Param('id') id: string, @Body() dto: SetBranchCodeDto, @CurrentUser('id') adminId: string) {
    return this.dd.setBranchCode(id, dto.branchCode, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Patch(':id/stage')
  setStage(@Param('id') id: string, @Body() dto: SetStageDto, @CurrentUser('id') adminId: string) {
    return this.dd.setStage(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Patch(':id/risk')
  setRisk(@Param('id') id: string, @Body() dto: SetRiskDto, @CurrentUser('id') adminId: string) {
    return this.dd.setRisk(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Patch(':id/review')
  recordReview(@Param('id') id: string, @Body() dto: RecordReviewDto, @CurrentUser('id') adminId: string) {
    return this.dd.recordReview(id, dto, adminId);
  }

  // ── Manual document-signature tracking ──────────────────────────────────────
  @Post(':id/signatures')
  addSignature(@Param('id') id: string, @Body() dto: AddSignatureDocDto, @CurrentUser('id') adminId: string) {
    return this.dd.addSignatureDoc(id, dto, adminId);
  }

  @Patch('signatures/:sigId')
  updateSignature(@Param('sigId') sigId: string, @Body() dto: UpdateSignatureDocDto, @CurrentUser('id') adminId: string) {
    return this.dd.updateSignatureDoc(sigId, dto, adminId);
  }

  @Delete('signatures/:sigId')
  deleteSignature(@Param('sigId') sigId: string, @CurrentUser('id') adminId: string) {
    return this.dd.deleteSignatureDoc(sigId, adminId);
  }
}
