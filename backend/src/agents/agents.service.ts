import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GeocodeService } from './geocode.service';
import { UpdateAgentProfileDto } from './dto/agent-profile.dto';

// Fields safe to expose on the public locator. Deliberately excludes email,
// auth state, and anything not opted into the public listing.
const PUBLIC_SELECT = {
  id: true,
  businessName: true,
  addressLine: true,
  city: true,
  state: true,
  zip: true,
  country: true,
  publicPhone: true,
  latitude: true,
  longitude: true,
} as const;

// Fields the agent sees/edits for their own listing.
const PROFILE_SELECT = {
  id: true,
  businessName: true,
  addressLine: true,
  city: true,
  state: true,
  zip: true,
  country: true,
  publicPhone: true,
  latitude: true,
  longitude: true,
  showOnMap: true,
  status: true,
} as const;

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private geocode: GeocodeService,
  ) {}

  // ── Public locator ────────────────────────────────────────────────────────
  // Only ACTIVE agents who opted in and have resolved coordinates.
  async listPublicLocations() {
    return this.prisma.agentUser.findMany({
      where: {
        status: 'ACTIVE',
        showOnMap: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: PUBLIC_SELECT,
      orderBy: [{ state: 'asc' }, { city: 'asc' }],
    });
  }

  // ── Agent self-service ──────────────────────────────────────────────────────
  async getMyProfile(agentId: string) {
    const agent = await this.prisma.agentUser.findUnique({
      where: { id: agentId },
      select: PROFILE_SELECT,
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async updateMyProfile(
    agentId: string,
    dto: UpdateAgentProfileDto,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const before = await this.prisma.agentUser.findUnique({
      where: { id: agentId },
      select: PROFILE_SELECT,
    });
    if (!before) throw new NotFoundException('Agent not found');

    // Re-geocode when any address component changed.
    const addressChanged =
      ('addressLine' in dto && dto.addressLine !== before.addressLine) ||
      ('city' in dto && dto.city !== before.city) ||
      ('state' in dto && dto.state !== before.state) ||
      ('zip' in dto && dto.zip !== before.zip) ||
      ('country' in dto && dto.country !== before.country);

    const data: Record<string, unknown> = { ...dto };

    if (addressChanged) {
      const coords = await this.geocode.geocode({
        addressLine: dto.addressLine ?? before.addressLine,
        city: dto.city ?? before.city,
        state: dto.state ?? before.state,
        zip: dto.zip ?? before.zip,
        country: dto.country ?? before.country,
      });
      if (coords) {
        data.latitude = coords.latitude;
        data.longitude = coords.longitude;
      } else {
        // Address could not be resolved — clear coords so it won't show a wrong pin.
        data.latitude = null;
        data.longitude = null;
      }
    }

    const updated = await this.prisma.agentUser.update({
      where: { id: agentId },
      data,
      select: PROFILE_SELECT,
    });

    await this.audit.log({
      action: 'agent.profile.update',
      agentId,
      actorType: 'agent',
      entity: 'AgentUser',
      entityId: agentId,
      before,
      after: updated,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });

    return {
      ...updated,
      geocoded: addressChanged ? data.latitude !== null : undefined,
    };
  }

  // ── Admin management ──────────────────────────────────────────────────────
  async listAllForAdmin() {
    return this.prisma.agentUser.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        active: true,
        emailVerified: true,
        businessName: true,
        city: true,
        state: true,
        showOnMap: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatus(
    agentId: string,
    status: string,
    adminId: string,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const before = await this.prisma.agentUser.findUnique({
      where: { id: agentId },
      select: { id: true, status: true },
    });
    if (!before) throw new NotFoundException('Agent not found');

    const updated = await this.prisma.agentUser.update({
      where: { id: agentId },
      data: { status },
      select: { id: true, status: true, showOnMap: true },
    });

    await this.audit.log({
      action: 'admin.agent.status',
      adminId,
      actorType: 'admin',
      entity: 'AgentUser',
      entityId: agentId,
      before,
      after: updated,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });

    return updated;
  }

  async setVisibility(
    agentId: string,
    showOnMap: boolean,
    adminId: string,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const before = await this.prisma.agentUser.findUnique({
      where: { id: agentId },
      select: { id: true, showOnMap: true },
    });
    if (!before) throw new NotFoundException('Agent not found');

    const updated = await this.prisma.agentUser.update({
      where: { id: agentId },
      data: { showOnMap },
      select: { id: true, status: true, showOnMap: true },
    });

    await this.audit.log({
      action: 'admin.agent.visibility',
      adminId,
      actorType: 'admin',
      entity: 'AgentUser',
      entityId: agentId,
      before,
      after: updated,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });

    return updated;
  }
}
