import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TellersService } from './tellers.service';
import { HumanVerificationService } from '../common/human-verification.service';

class SubmitTellerDto {
  @Matches(/^[a-z0-9]{6}$/, { message: 'Branch code must be 6 lowercase letters/digits (ask your agent)' })
  branchCode: string;
  @IsString() @MaxLength(80) firstName: string;
  @IsString() @MaxLength(80) lastName: string;
  @IsEmail() email: string;
  @IsString() @MaxLength(30) phone: string;
  @IsOptional() @IsString() @MaxLength(200) addressLine?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(40) state?: string;
  @IsOptional() @IsString() @MaxLength(15) zip?: string;
  @IsOptional() @IsString() @MaxLength(160) signatureName?: string;
  @IsBoolean() signatureConsent: boolean;
  @IsOptional() @IsString() @MaxLength(3000) humanVerificationToken?: string;
  @IsOptional() @IsString() @MaxLength(40) humanVerificationAnswer?: string;
}

class UpdateTellerDto {
  @IsOptional() @Matches(/^[a-z0-9]{6}$/, { message: 'Branch code must be 6 lowercase letters/digits' })
  branchCode?: string;
  @IsOptional() @IsIn(['NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  status?: string;
}

@Controller('agents/tellers')
export class TellersPublicController {
  constructor(private tellers: TellersService, private humanVerification: HumanVerificationService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('apply')
  async apply(@Body() dto: SubmitTellerDto, @Req() req: Request) {
    if (!this.humanVerification.verify(dto.humanVerificationToken, dto.humanVerificationAnswer, 'teller_application'))
      throw new ForbiddenException('Security check failed. Please answer the verification question.');
    if (!dto.signatureConsent) throw new ForbiddenException('Consent to the background check is required.');
    const { humanVerificationToken: _t, humanVerificationAnswer: _a, ...data } = dto;
    return this.tellers.submit(data, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('admin/teller-applications')
export class TellersAdminController {
  constructor(private tellers: TellersService) {}

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Get()
  list(@Query('status') status?: string) {
    return this.tellers.list(status);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTellerDto, @CurrentUser('id') adminId: string) {
    return this.tellers.update(id, dto, adminId);
  }
}
