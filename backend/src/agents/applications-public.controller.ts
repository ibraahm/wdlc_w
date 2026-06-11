import { Body, Controller, ForbiddenException, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/application.dto';
import { RecaptchaService } from '../common/recaptcha.service';
import { HumanVerificationService } from '../common/human-verification.service';

// Unauthenticated "Become an Agent" application intake.
@Controller('agents')
export class ApplicationsPublicController {
  private readonly logger = new Logger(ApplicationsPublicController.name);

  constructor(
    private applications: ApplicationsService,
    private recaptcha: RecaptchaService,
    private humanVerification: HumanVerificationService,
  ) {}

  @Post('apply')
  async apply(@Body() dto: CreateApplicationDto, @Req() req: Request) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `agent application submit received: tokenPresent=${!!dto.recaptchaToken} humanTokenPresent=${!!dto.humanVerificationToken} applicantType=${dto.applicantType ?? 'none'} product=${dto.productsOffered ?? 'none'}`,
      );
    }
    const recaptchaOk = dto.recaptchaToken
      ? await this.recaptcha.verify(dto.recaptchaToken, 'agent_application')
      : false;
    const fallbackOk = recaptchaOk
      ? false
      : this.humanVerification.verify(
        dto.humanVerificationToken,
        dto.humanVerificationAnswer,
        'agent_application',
      );
    const ok = recaptchaOk || fallbackOk;
    if (!ok) throw new ForbiddenException('Security check failed. Please try again.');
    const {
      recaptchaToken: _recaptchaToken,
      humanVerificationToken: _humanVerificationToken,
      humanVerificationAnswer: _humanVerificationAnswer,
      ...data
    } = dto;
    return this.applications.create(data, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
