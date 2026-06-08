import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { RefreshTokenService } from './refresh-token.service';
import { RecaptchaService } from './recaptcha.service';

@Global()
@Module({
  providers: [MailService, RefreshTokenService, RecaptchaService],
  exports: [MailService, RefreshTokenService, RecaptchaService],
})
export class CommonModule {}
