import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';
import { CollectDto } from './dto/collect.dto';
import {
  countryFromHeaders,
  regionFromHeaders,
  cityFromHeaders,
  hashIp,
  normalizePath,
} from './geo.util';

// Ingestion endpoint for the per-app visit beacons. Each app's same-origin
// /api/collect route forwards here server-side with the edge geo headers and
// the resolved client IP, authenticated by a shared ingest key (when set).
@Controller('analytics')
export class AnalyticsPublicController {
  constructor(private analytics: AnalyticsService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @Post('collect')
  @HttpCode(204)
  async collect(@Body() dto: CollectDto, @Req() req: Request): Promise<void> {
    // When ANALYTICS_INGEST_KEY is configured, only callers holding it (our app
    // servers) may write — keeps the public endpoint from being poisoned.
    const expected = process.env.ANALYTICS_INGEST_KEY;
    if (expected && req.headers['x-analytics-key'] !== expected) return;

    const forwardedIp = (req.headers['x-visitor-ip'] as string | undefined) || req.ip;

    await this.analytics.record({
      portal: dto.portal,
      path: normalizePath(dto.path),
      country: countryFromHeaders(req.headers),
      region: regionFromHeaders(req.headers),
      city: cityFromHeaders(req.headers),
      ipHash: hashIp(forwardedIp),
      referrer: dto.referrer ? dto.referrer.slice(0, 512) : null,
      userAgent: (req.headers['user-agent'] as string | undefined)?.slice(0, 512) ?? null,
    });
  }
}
