import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DocuSignModule } from '../docusign/docusign.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [PassportModule, DocuSignModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
