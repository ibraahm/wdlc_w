import { Controller, Get, Query } from '@nestjs/common';
import { HumanVerificationService } from './human-verification.service';

@Controller('human-verification')
export class HumanVerificationController {
  constructor(private readonly humanVerification: HumanVerificationService) {}

  @Get('challenge')
  challenge(@Query('context') context = 'default') {
    return this.humanVerification.createChallenge(context);
  }
}
