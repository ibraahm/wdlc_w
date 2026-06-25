import { Module } from '@nestjs/common';
import { DocuSignService } from './docusign.service';

@Module({
  providers: [DocuSignService],
  exports: [DocuSignService],
})
export class DocuSignModule {}
