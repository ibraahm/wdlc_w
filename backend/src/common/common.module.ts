import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { RefreshTokenService } from './refresh-token.service';

@Global()
@Module({
  providers: [MailService, RefreshTokenService],
  exports: [MailService, RefreshTokenService],
})
export class CommonModule {}
