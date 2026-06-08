import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNetworkCountryDto {
  @IsString() @MaxLength(200) name: string;
  @IsOptional() @IsArray() payoutTypes?: string[];
  @IsOptional() @IsString() @MaxLength(500) flagUrl?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateNetworkCountryDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsArray() payoutTypes?: string[];
  @IsOptional() @IsString() @MaxLength(500) flagUrl?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Injectable()
export class NetworkService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private serialize(row: { payoutTypes: string } & Record<string, unknown>) {
    try { return { ...row, payoutTypes: JSON.parse(row.payoutTypes) }; } catch { return { ...row, payoutTypes: [] }; }
  }

  async listPublic() {
    const rows = await this.prisma.networkCountry.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    return rows.map((r) => this.serialize(r));
  }

  async listAll() {
    const rows = await this.prisma.networkCountry.findMany({ orderBy: { name: 'asc' } });
    return rows.map((r) => this.serialize(r));
  }

  async create(dto: CreateNetworkCountryDto, adminId: string) {
    const row = await this.prisma.networkCountry.create({
      data: { name: dto.name, payoutTypes: JSON.stringify(dto.payoutTypes ?? []), flagUrl: dto.flagUrl ?? null, active: dto.active ?? true },
    });
    await this.audit.log({ action: 'network.create', adminId, entity: 'NetworkCountry', entityId: row.id, after: { name: dto.name } });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateNetworkCountryDto, adminId: string) {
    const existing = await this.prisma.networkCountry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Country ${id} not found`);
    const updated = await this.prisma.networkCountry.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.payoutTypes !== undefined ? { payoutTypes: JSON.stringify(dto.payoutTypes) } : {}),
        ...(dto.flagUrl !== undefined ? { flagUrl: dto.flagUrl } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    await this.audit.log({ action: 'network.update', adminId, entity: 'NetworkCountry', entityId: id, after: dto });
    return this.serialize(updated);
  }

  async remove(id: string, adminId: string) {
    const existing = await this.prisma.networkCountry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Country ${id} not found`);
    await this.prisma.networkCountry.delete({ where: { id } });
    await this.audit.log({ action: 'network.delete', adminId, entity: 'NetworkCountry', entityId: id });
    return { ok: true };
  }
}
