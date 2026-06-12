import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { RefreshTokenService } from './refresh-token.service';
import { HumanVerificationController } from './human-verification.controller';
import { HumanVerificationService } from './human-verification.service';

@Global()
@Module({
  controllers: [HumanVerificationController],
  providers: [MailService, RefreshTokenService, HumanVerificationService],
  exports: [MailService, RefreshTokenService, HumanVerificationService],
})
export class CommonModule {}
