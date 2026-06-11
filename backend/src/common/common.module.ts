import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { RefreshTokenService } from './refresh-token.service';
import { RecaptchaService } from './recaptcha.service';
import { HumanVerificationController } from './human-verification.controller';
import { HumanVerificationService } from './human-verification.service';

@Global()
@Module({
  controllers: [HumanVerificationController],
  providers: [MailService, RefreshTokenService, RecaptchaService, HumanVerificationService],
  exports: [MailService, RefreshTokenService, RecaptchaService, HumanVerificationService],
})
export class CommonModule {}
