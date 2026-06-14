import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PassportModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
