import { Body, Controller, ForbiddenException, Logger, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/application.dto';
import { HumanVerificationService } from '../common/human-verification.service';

// Unauthenticated "Become an Agent" application intake.
@Controller('agents')
export class ApplicationsPublicController {
  private readonly logger = new Logger(ApplicationsPublicController.name);

  constructor(
    private applications: ApplicationsService,
    private humanVerification: HumanVerificationService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('apply')
  async apply(@Body() dto: CreateApplicationDto, @Req() req: Request) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `agent application submit received: humanTokenPresent=${!!dto.humanVerificationToken} applicantType=${dto.applicantType ?? 'none'} product=${dto.productsOffered ?? 'none'}`,
      );
    }
    const ok = this.humanVerification.verify(
      dto.humanVerificationToken,
      dto.humanVerificationAnswer,
      'agent_application',
    );
    if (!ok) throw new ForbiddenException('Security check failed. Please try again.');
    const {
      humanVerificationToken: _humanVerificationToken,
      humanVerificationAnswer: _humanVerificationAnswer,
      ...data
    } = dto;
    // Prefer the client IP forwarded by the web proxy hop; fall back to req.ip.
    const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim();
    const ip = fwd || (req.headers['x-real-ip'] as string | undefined) || req.ip;
    return this.applications.create(data, {
      ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
