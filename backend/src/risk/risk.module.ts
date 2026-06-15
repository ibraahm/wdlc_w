import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { RegionalModule } from '../regional/regional.module';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';

@Module({
  imports: [PassportModule, AuditModule, RegionalModule],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
