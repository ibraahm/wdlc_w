import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { RegionalModule } from '../regional/regional.module';
import { TrainingService } from './training.service';
import { TrainingPortalController } from './training-portal.controller';
import { TrainingAdminController } from './training-admin.controller';

@Module({
  imports: [PassportModule, AuditModule, RegionalModule],
  controllers: [TrainingPortalController, TrainingAdminController],
  providers: [TrainingService],
})
export class TrainingModule {}
