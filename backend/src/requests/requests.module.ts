import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { RegionalModule } from '../regional/regional.module';
import { RequestsService } from './requests.service';
import { RequestsPortalController } from './requests-portal.controller';
import { RequestsAdminController } from './requests-admin.controller';

@Module({
  imports: [PassportModule, AuditModule, RegionalModule],
  controllers: [RequestsPortalController, RequestsAdminController],
  providers: [RequestsService],
})
export class RequestsModule {}
