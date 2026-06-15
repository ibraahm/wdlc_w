import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegionalService } from '../regional/regional.service';

// The standard agent risk factors (BSA/AML). The UI presents these; the score
// is the mean rating (1=Low, 2=Medium, 3=High) mapped to an overall rating.
export const RISK_FACTORS = [
  { key: 'geography', label: 'Geographic risk (states / corridors served)' },
  { key: 'businessType', label: 'Business type' },
  { key: 'volume', label: 'Transaction volume' },
  { key: 'customerBase', label: 'Customer base' },
  { key: 'products', label: 'Products & services' },
  { key: 'ownership', label: 'Ownership / PEP exposure' },
  { key: 'history', label: 'Compliance history / adverse media' },
];

type Factor = { key: string; label: string; rating: number };

function ratingFromScore(avg: number): string {
  if (avg >= 2.4) return 'HIGH';
  if (avg >= 1.7) return 'MEDIUM';
  return 'LOW';
}

@Injectable()
export class RiskService {
  constructor(private prisma: PrismaService, private audit: AuditService, private regional: RegionalService) {}

  private async fileInScope(ddFileId: string, adminId: string, role?: string) {
    const file = await this.prisma.agentDDFile.findUnique({
      where: { id: ddFileId },
      select: { id: true, branchCode: true, regionalOfficeId: true },
    });
    if (!file) throw new NotFoundException('DD file not found');
    const scope = await this.regional.scopeForAdmin(adminId, role);
    if (scope && file.regionalOfficeId !== scope.officeId) throw new NotFoundException('DD file not found');
    return file;
  }

  async listForFile(ddFileId: string, adminId: string, role?: string) {
    await this.fileInScope(ddFileId, adminId, role);
    const rows = await this.prisma.riskAssessment.findMany({ where: { ddFileId }, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => ({ ...r, factors: JSON.parse(r.factors || '[]') }));
  }

  async create(ddFileId: string, dto: any, adminId: string, role?: string) {
    const file = await this.fileInScope(ddFileId, adminId, role);

    const raw: Factor[] = Array.isArray(dto.factors) ? dto.factors : [];
    const factors = raw
      .filter((f) => f && typeof f.rating === 'number' && f.rating >= 1 && f.rating <= 3)
      .map((f) => ({ key: String(f.key).slice(0, 40), label: String(f.label ?? f.key).slice(0, 160), rating: Math.round(f.rating) }));
    if (factors.length === 0) throw new BadRequestException('Rate at least one risk factor');

    const avg = factors.reduce((n, f) => n + f.rating, 0) / factors.length;
    const score = Math.round((avg / 3) * 100);
    const rating = ratingFromScore(avg);

    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId }, select: { name: true, email: true } });

    const assessment = await this.prisma.riskAssessment.create({
      data: {
        ddFileId,
        branchCode: file.branchCode,
        regionalOfficeId: file.regionalOfficeId,
        factors: JSON.stringify(factors),
        score,
        rating,
        notes: dto.notes ? String(dto.notes).slice(0, 4000) : null,
        assessedBy: admin?.name || admin?.email || null,
      },
    });

    // Write the computed rating back onto the DD file.
    await this.prisma.agentDDFile.update({ where: { id: ddFileId }, data: { riskRating: rating } });

    await this.audit.log({
      action: 'agent.dd.risk_assessment', adminId, entity: 'AgentDDFile', entityId: ddFileId,
      after: { rating, score },
    });

    return { ...assessment, factors };
  }
}
