import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { RegionalService } from './regional.service';
import { RegionalAdminController } from './regional.controller';

@Module({
  imports: [PassportModule, AuditModule],
  controllers: [RegionalAdminController],
  providers: [RegionalService],
  exports: [RegionalService],
})
export class RegionalModule {}
