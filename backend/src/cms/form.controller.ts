import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FormService } from './form.service';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from './dto/form.dto';
import { HumanVerificationService } from '../common/human-verification.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('cms/forms')
export class FormController {
  private readonly logger = new Logger(FormController.name);

  constructor(
    private forms: FormService,
    private humanVerification: HumanVerificationService,
  ) {}

  // ── Admin: list / read ────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get()
  list() {
    return this.forms.listAll();
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('id/:id')
  getById(@Param('id') id: string) {
    return this.forms.getById(id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('id/:id/submissions')
  submissions(@Param('id') id: string) {
    return this.forms.listSubmissions(id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Post()
  create(@Body() dto: CreateFormDto, @CurrentUser() user: AuthUser) {
    return this.forms.create(dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Patch('id/:id')
  update(@Param('id') id: string, @Body() dto: UpdateFormDto, @CurrentUser() user: AuthUser) {
    return this.forms.update(id, dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'MANAGER')
  @Delete('id/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.forms.remove(id, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Delete('submissions/:submissionId')
  removeSubmission(@Param('submissionId') submissionId: string, @CurrentUser() user: AuthUser) {
    return this.forms.deleteSubmission(submissionId, user.id);
  }

  // ── Public: render + submit ────────────────────────────────────────────────
  @Public()
  @Get(':slug')
  getPublic(@Param('slug') slug: string) {
    return this.forms.getPublic(slug);
  }

  @Public()
  @Post(':slug/submit')
  async submit(@Param('slug') slug: string, @Body() dto: SubmitFormDto, @Req() req: Request) {
    // `recaptcha` is the form's legacy "verification required" flag in the CMS.
    const form = await this.forms.getPublic(slug) as { recaptcha?: boolean };
    const action = dto.verificationAction || 'form_submit';
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `form submit received: slug=${slug} action=${action} humanTokenPresent=${!!dto.humanVerificationToken}`,
      );
    }

    if (form.recaptcha !== false) {
      const ok = this.humanVerification.verify(dto.humanVerificationToken, dto.humanVerificationAnswer, action);
      if (!ok) {
        throw new BadRequestException('Security check failed. Please try again.');
      }
    }

    return this.forms.submit(slug, dto.data, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
