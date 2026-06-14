import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RegionalModule } from '../regional/regional.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PassportModule, RegionalModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
