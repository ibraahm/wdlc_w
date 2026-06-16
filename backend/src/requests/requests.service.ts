import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegionalService } from '../regional/regional.service';
import { safeHttpUrl } from '../training/sanitize';

const TYPES = ['RISK_ASSESSMENT', 'LOCATION_DD', 'CHECKLIST', 'PHOTOS', 'OTHER'];
const STATUSES = ['OPEN', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CLOSED'];

type Attachment = { name: string; url: string; kind?: string };

function parseAttachments(input: unknown): string {
  if (input === undefined || input === null) return '[]';
  const arr = Array.isArray(input) ? input : [];
  const clean: Attachment[] = [];
  for (const a of arr as any[]) {
    // Only keep attachments whose URL is a valid http(s) link. This rejects
    // javascript:/data:/file: URLs before they are stored and later rendered
    // as clickable anchors in the admin queue and agent portal.
    const url = a && safeHttpUrl(a.url);
    if (url) {
      clean.push({ name: String(a.name ?? url).slice(0, 200), url: url.slice(0, 1000), kind: a.kind ? String(a.kind).slice(0, 20) : 'link' });
    }
  }
  return JSON.stringify(clean.slice(0, 30));
}

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private regional: RegionalService) {}

  // ── Agent (portal) side ────────────────────────────────────────────────────
  private async resolveAgentRouting(agentId: string) {
    const user = await this.prisma.agentUser.findUnique({ where: { id: agentId }, select: { branchCode: true } });
    const branchCode = user?.branchCode ?? null;
    let regionalOfficeId: string | null = null;
    if (branchCode) {
      const file = await this.prisma.agentDDFile.findUnique({ where: { branchCode }, select: { regionalOfficeId: true } });
      regionalOfficeId = file?.regionalOfficeId ?? null;
    }
    return { branchCode, regionalOfficeId };
  }

  async createForAgent(agentId: string, dto: any) {
    if (!dto.subject?.trim()) throw new BadRequestException('A subject is required');
    if (dto.type && !TYPES.includes(dto.type)) throw new BadRequestException('Invalid request type');
    const { branchCode, regionalOfficeId } = await this.resolveAgentRouting(agentId);
    const request = await this.prisma.agentRequest.create({
      data: {
        agentId,
        branchCode,
        regionalOfficeId,
        type: dto.type && TYPES.includes(dto.type) ? dto.type : 'OTHER',
        subject: dto.subject.trim().slice(0, 200),
        details: (dto.details ?? '').slice(0, 5000),
        attachments: parseAttachments(dto.attachments),
        status: 'OPEN',
      },
    });
    await this.audit.log({ action: 'request.create', agentId, entity: 'AgentRequest', entityId: request.id, after: { type: request.type } });
    return request;
  }

  async listForAgent(agentId: string) {
    const rows = await this.prisma.agentRequest.findMany({ where: { agentId }, orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => ({ ...r, attachments: JSON.parse(r.attachments || '[]') }));
  }

  async getForAgent(agentId: string, id: string) {
    const r = await this.prisma.agentRequest.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!r || r.agentId !== agentId) throw new NotFoundException('Request not found');
    return { ...r, attachments: JSON.parse(r.attachments || '[]') };
  }

  async agentMessage(agentId: string, id: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Message is required');
    const r = await this.prisma.agentRequest.findUnique({ where: { id } });
    if (!r || r.agentId !== agentId) throw new NotFoundException('Request not found');
    const agent = await this.prisma.agentUser.findUnique({ where: { id: agentId }, select: { firstName: true, lastName: true } });
    const msg = await this.prisma.agentRequestMessage.create({
      data: { requestId: id, authorType: 'agent', authorName: agent ? `${agent.firstName} ${agent.lastName}` : null, body: body.trim().slice(0, 5000) },
    });
    // Re-open if the office had asked for info.
    if (r.status === 'NEEDS_INFO') await this.prisma.agentRequest.update({ where: { id }, data: { status: 'IN_REVIEW' } });
    return msg;
  }

  // ── Office / admin side ─────────────────────────────────────────────────────
  private async officeScope(adminId: string, role?: string): Promise<string | null | undefined> {
    // undefined = unrestricted; a string = officeId; null = officer with no office (sees nothing)
    const scope = await this.regional.scopeForAdmin(adminId, role);
    if (!scope) return undefined;
    return scope.officeId; // may be null
  }

  // Attach agent name/email to a set of requests (no FK relation defined).
  private async withAgents(rows: any[]) {
    const ids = Array.from(new Set(rows.map((r) => r.agentId)));
    const agents = ids.length
      ? await this.prisma.agentUser.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [];
    const byId = new Map(agents.map((a) => [a.id, a]));
    return rows.map((r) => ({
      ...r,
      attachments: JSON.parse(r.attachments || '[]'),
      agent: byId.get(r.agentId) ?? null,
    }));
  }

  async listForOffice(adminId: string, role: string | undefined, status?: string) {
    const officeId = await this.officeScope(adminId, role);
    const where: any = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (officeId !== undefined) where.regionalOfficeId = officeId ?? '__none__';
    const rows = await this.prisma.agentRequest.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 500 });
    return this.withAgents(rows);
  }

  private async assertOfficeAccess(adminId: string, role: string | undefined, request: { regionalOfficeId: string | null }) {
    const officeId = await this.officeScope(adminId, role);
    if (officeId !== undefined && request.regionalOfficeId !== officeId) {
      throw new NotFoundException('Request not found');
    }
  }

  async getForOffice(adminId: string, role: string | undefined, id: string) {
    const r = await this.prisma.agentRequest.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!r) throw new NotFoundException('Request not found');
    await this.assertOfficeAccess(adminId, role, r);
    const [withAgent] = await this.withAgents([r]);
    return { ...withAgent, messages: (r as any).messages };
  }

  async updateForOffice(adminId: string, role: string | undefined, id: string, dto: any) {
    const r = await this.prisma.agentRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    await this.assertOfficeAccess(adminId, role, r);
    const data: any = {};
    if (dto.status !== undefined) {
      if (!STATUSES.includes(dto.status)) throw new BadRequestException('Invalid status');
      data.status = dto.status;
    }
    if (dto.assignee !== undefined) data.assignee = dto.assignee || null;
    const updated = await this.prisma.agentRequest.update({ where: { id }, data });
    await this.audit.log({ action: 'request.update', adminId, entity: 'AgentRequest', entityId: id, after: data });
    return updated;
  }

  async officeMessage(adminId: string, role: string | undefined, id: string, body: string, authorName?: string) {
    if (!body?.trim()) throw new BadRequestException('Message is required');
    const r = await this.prisma.agentRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    await this.assertOfficeAccess(adminId, role, r);
    const msg = await this.prisma.agentRequestMessage.create({
      data: { requestId: id, authorType: 'office', authorName: authorName ?? null, body: body.trim().slice(0, 5000) },
    });
    await this.audit.log({ action: 'request.message', adminId, entity: 'AgentRequest', entityId: id });
    return msg;
  }
}
