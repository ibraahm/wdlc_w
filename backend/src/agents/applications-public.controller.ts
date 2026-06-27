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
    // Use req.ip, which Express derives from X-Forwarded-For under the
    // `trust proxy` setting configured in main.ts (production). Parsing the
    // raw header here is both redundant and unsafe — the left-most XFF entry
    // is client-spoofable. This matches how every other controller logs IPs.
    //
    // TEMP DIAGNOSTIC (SIGNER_METADATA_DEBUG=1): confirm what IP/UA the backend
    // actually receives for agent submissions — to tell apart legacy data, local
    // dev (127.0.0.1 is genuinely the client), and an unconfigured prod proxy.
    // Logs metadata only (never form contents/tokens). Remove after verifying.
    if (process.env.SIGNER_METADATA_DEBUG === '1') {
      this.logger.warn(
        `[signer-metadata] agent apply  ip=${req.ip}  ua=${JSON.stringify(req.headers['user-agent'])}  ` +
          `bodyUaPresent=${!!dto.signatureUserAgent}`,
      );
    }
    return this.applications.create(data, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
