import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Portal } from './dto/collect.dto';

export interface RecordVisitInput {
  portal: Portal;
  path: string;
  country: string | null;
  region: string | null;
  city: string | null;
  ipHash: string | null;
  referrer: string | null;
  userAgent: string | null;
}

export interface AnalyticsSummary {
  rangeDays: number;
  totalVisits: number;
  uniqueVisitors: number;
  byPortal: { portal: string; visits: number }[];
  topCountries: { country: string; visits: number }[];
  topPaths: { portal: string; path: string; visits: number }[];
  daily: { date: string; visits: number }[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async record(input: RecordVisitInput): Promise<void> {
    await this.prisma.visitEvent.create({ data: input });
  }

  async summary(rangeDays = 30): Promise<AnalyticsSummary> {
    const days = Math.min(Math.max(Math.trunc(rangeDays) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where = { createdAt: { gte: since } };

    const [totalVisits, uniqueRows, byPortalRaw, topCountriesRaw, topPathsRaw, rows] =
      await Promise.all([
        this.prisma.visitEvent.count({ where }),
        this.prisma.visitEvent.findMany({
          where: { ...where, ipHash: { not: null } },
          distinct: ['ipHash'],
          select: { ipHash: true },
        }),
        this.prisma.visitEvent.groupBy({
          by: ['portal'],
          where,
          _count: { _all: true },
        }),
        this.prisma.visitEvent.groupBy({
          by: ['country'],
          where: { ...where, country: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { country: 'desc' } },
          take: 20,
        }),
        this.prisma.visitEvent.groupBy({
          by: ['portal', 'path'],
          where,
          _count: { _all: true },
          orderBy: { _count: { path: 'desc' } },
          take: 20,
        }),
        // Pull just timestamps for a per-day series; visit volume is low enough
        // that grouping in JS keeps the query database-agnostic and simple.
        this.prisma.visitEvent.findMany({ where, select: { createdAt: true } }),
      ]);

    const dailyMap = new Map<string, number>();
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    const daily = Array.from(dailyMap.entries())
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      rangeDays: days,
      totalVisits,
      uniqueVisitors: uniqueRows.length,
      byPortal: byPortalRaw
        .map((g) => ({ portal: g.portal, visits: g._count._all }))
        .sort((a, b) => b.visits - a.visits),
      topCountries: topCountriesRaw.map((g) => ({
        country: g.country as string,
        visits: g._count._all,
      })),
      topPaths: topPathsRaw.map((g) => ({
        portal: g.portal,
        path: g.path,
        visits: g._count._all,
      })),
      daily,
    };
  }
}
