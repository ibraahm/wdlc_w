import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodeService } from './geocode.service';
import { Readable } from 'stream';
import ExcelJS from 'exceljs';

export interface ImportRow {
  businessName: string;
  addressLine?: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;
  publicPhone?: string;
  importKey?: string;
}

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService, private geocode: GeocodeService) {}

  async listPublic() {
    return this.prisma.agentLocation.findMany({
      where: { active: true, latitude: { not: null }, longitude: { not: null } },
      select: {
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
      },
    });
  }

  async listAll() {
    return this.prisma.agentLocation.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async parseExcel(buffer: Buffer, filename?: string): Promise<ImportRow[]> {
    const isCsv = !!filename && filename.toLowerCase().endsWith('.csv');
    const workbook = new ExcelJS.Workbook();
    try {
      if (isCsv) {
        await workbook.csv.read(Readable.from(buffer));
      } else {
        // exceljs's bundled Buffer typings predate ArrayBufferLike; cast is safe.
        await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      }
    } catch {
      throw new BadRequestException('Could not parse file. Upload a valid .xlsx or .csv file.');
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel file has no sheets.');

    // First non-empty row is the header; remaining rows become objects keyed by header.
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col] = cell.text?.trim() ?? '';
    });
    if (headers.filter(Boolean).length === 0) {
      throw new BadRequestException('No data rows found in the spreadsheet.');
    }

    const rows: Record<string, string>[] = [];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const obj: Record<string, string> = {};
      let hasValue = false;
      headerRow.eachCell({ includeEmpty: true }, (_cell, col) => {
        const key = headers[col];
        if (!key) return;
        const text = row.getCell(col).text?.trim() ?? '';
        obj[key] = text;
        if (text) hasValue = true;
      });
      if (hasValue) rows.push(obj);
    }
    if (rows.length === 0) throw new BadRequestException('No data rows found in the spreadsheet.');

    // Normalise column headers (case-insensitive, strips spaces/underscores)
    function col(row: Record<string, string>, ...keys: string[]): string {
      for (const k of keys) {
        const found = Object.keys(row).find(
          (rk) => rk.replace(/[\s_]/g, '').toLowerCase() === k.replace(/[\s_]/g, '').toLowerCase(),
        );
        if (found && row[found]) return String(row[found]).trim();
      }
      return '';
    }

    return rows.map((r, i): ImportRow => {
      const businessName = col(r, 'businessname', 'business', 'name', 'agentname');
      const city = col(r, 'city');
      const state = col(r, 'state', 'st');

      if (!businessName) throw new BadRequestException(`Row ${i + 2}: "Business Name" is required.`);
      if (!city) throw new BadRequestException(`Row ${i + 2}: "City" is required.`);
      if (!state) throw new BadRequestException(`Row ${i + 2}: "State" is required.`);

      return {
        businessName,
        addressLine: col(r, 'address', 'addressline', 'streetaddress', 'street') || undefined,
        city,
        state,
        zip: col(r, 'zip', 'zipcode', 'postalcode') || undefined,
        country: col(r, 'country') || 'USA',
        publicPhone: col(r, 'phone', 'publicphone', 'telephone') || undefined,
        importKey: col(r, 'id', 'importkey', 'key') || undefined,
      };
    });
  }

  async importRows(rows: ImportRow[]): Promise<{ created: number; updated: number; geocoded: number }> {
    let created = 0;
    let updated = 0;
    let geocoded = 0;

    for (const row of rows) {
      const coords = await this.geocode.geocode({
        addressLine: row.addressLine,
        city: row.city,
        state: row.state,
        zip: row.zip,
        country: row.country,
      });
      if (coords) geocoded++;

      const data = {
        businessName: row.businessName,
        addressLine: row.addressLine ?? null,
        city: row.city,
        state: row.state,
        zip: row.zip ?? null,
        country: row.country ?? 'USA',
        publicPhone: row.publicPhone ?? null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        active: true,
      };

      if (row.importKey) {
        const existing = await this.prisma.agentLocation.findUnique({
          where: { importKey: row.importKey },
        });
        if (existing) {
          await this.prisma.agentLocation.update({ where: { importKey: row.importKey }, data });
          updated++;
        } else {
          await this.prisma.agentLocation.create({ data: { ...data, importKey: row.importKey } });
          created++;
        }
      } else {
        await this.prisma.agentLocation.create({ data });
        created++;
      }
    }

    return { created, updated, geocoded };
  }

  async create(dto: {
    businessName: string;
    addressLine?: string;
    city: string;
    state: string;
    zip?: string;
    country?: string;
    publicPhone?: string;
    active?: boolean;
  }) {
    const coords = await this.geocode.geocode({
      addressLine: dto.addressLine,
      city: dto.city,
      state: dto.state,
      zip: dto.zip,
      country: dto.country,
    });
    return this.prisma.agentLocation.create({
      data: {
        businessName: dto.businessName,
        addressLine: dto.addressLine ?? null,
        city: dto.city,
        state: dto.state,
        zip: dto.zip ?? null,
        country: dto.country ?? 'USA',
        publicPhone: dto.publicPhone ?? null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async update(
    id: string,
    dto: {
      businessName?: string;
      addressLine?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      publicPhone?: string;
      active?: boolean;
    },
  ) {
    const existing = await this.prisma.agentLocation.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Location not found.');

    const addressChanged =
      (dto.addressLine !== undefined && dto.addressLine !== existing.addressLine) ||
      (dto.city !== undefined && dto.city !== existing.city) ||
      (dto.state !== undefined && dto.state !== existing.state) ||
      (dto.zip !== undefined && dto.zip !== existing.zip) ||
      (dto.country !== undefined && dto.country !== existing.country);

    let coords: { latitude: number; longitude: number } | null | undefined;
    if (addressChanged) {
      coords = await this.geocode.geocode({
        addressLine: dto.addressLine ?? existing.addressLine,
        city: dto.city ?? existing.city,
        state: dto.state ?? existing.state,
        zip: dto.zip ?? existing.zip,
        country: dto.country ?? existing.country,
      });
    }

    return this.prisma.agentLocation.update({
      where: { id },
      data: {
        ...(dto.businessName !== undefined ? { businessName: dto.businessName } : {}),
        ...(dto.addressLine !== undefined ? { addressLine: dto.addressLine || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.zip !== undefined ? { zip: dto.zip || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country || 'USA' } : {}),
        ...(dto.publicPhone !== undefined ? { publicPhone: dto.publicPhone || null } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(addressChanged
          ? { latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null }
          : {}),
      },
    });
  }

  async toggleActive(id: string, active: boolean) {
    return this.prisma.agentLocation.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.prisma.agentLocation.delete({ where: { id } });
    return { ok: true };
  }
}
