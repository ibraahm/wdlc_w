import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { GeoService } from './geo.service';
import { AnalyticsPublicController } from './analytics-public.controller';
import { AnalyticsAdminController } from './analytics-admin.controller';

@Module({
  imports: [PassportModule],
  controllers: [AnalyticsPublicController, AnalyticsAdminController],
  providers: [AnalyticsService, GeoService],
})
export class AnalyticsModule {}
