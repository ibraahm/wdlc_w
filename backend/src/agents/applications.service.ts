import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/application.dto';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateApplicationDto, ctx?: { ip?: string; userAgent?: string }) {
    const app = await this.prisma.agentApplication.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        businessStreet: dto.businessStreet,
        businessCountry: dto.businessCountry,
        businessState: dto.businessState ?? null,
        businessCity: dto.businessCity,
        businessZip: dto.businessZip,
        businessPhone: dto.businessPhone,
        email: dto.email,
        howFound: dto.howFound ?? null,
        howFoundOther: dto.howFoundOther ?? null,
        businessType: dto.businessType ?? null,
        businessTypeOther: dto.businessTypeOther ?? null,
        productsOffered: dto.productsOffered ?? null,
        currentlyProvides: dto.currentlyProvides ?? false,
        currentProvider: dto.currentProvider ?? null,
        currentProviderOther: dto.currentProviderOther ?? null,
        providedPast: dto.providedPast ?? false,
        pastProvider: dto.pastProvider ?? null,
        pastProviderOther: dto.pastProviderOther ?? null,
        declinedBefore: dto.declinedBefore ?? false,
        declinedExplain: dto.declinedExplain ?? null,
        preferredLanguage: dto.preferredLanguage ?? null,
        preferredLanguageOther: dto.preferredLanguageOther ?? null,
        monthlyVolume: dto.monthlyVolume ?? null,
        totalLocations: dto.totalLocations ?? null,
        comments: dto.comments ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    });
    return { ok: true, id: app.id };
  }

  listAll(status?: string) {
    return this.prisma.agentApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatus(id: string, status: string) {
    const existing = await this.prisma.agentApplication.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Application not found');
    return this.prisma.agentApplication.update({ where: { id }, data: { status } });
  }

  async remove(id: string) {
    await this.prisma.agentApplication.delete({ where: { id } });
    return { ok: true };
  }
}
