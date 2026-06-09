import { Body, Controller, ForbiddenException, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/application.dto';
import { RecaptchaService } from '../common/recaptcha.service';

// Unauthenticated "Become an Agent" application intake.
@Controller('agents')
export class ApplicationsPublicController {
  constructor(
    private applications: ApplicationsService,
    private recaptcha: RecaptchaService,
  ) {}

  @Post('apply')
  async apply(@Body() dto: CreateApplicationDto, @Req() req: Request) {
    const ok = await this.recaptcha.verify(dto.recaptchaToken, 'agent_application');
    if (!ok) throw new ForbiddenException('Security check failed. Please try again.');
    const { recaptchaToken: _recaptchaToken, ...data } = dto;
    return this.applications.create(data, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
