import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodeService } from './geocode.service';
import * as XLSX from 'xlsx';

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

  async parseExcel(buffer: Buffer): Promise<ImportRow[]> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Could not parse file. Upload a valid .xlsx or .csv file.');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('Excel file has no sheets.');

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
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

  async toggleActive(id: string, active: boolean) {
    return this.prisma.agentLocation.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.prisma.agentLocation.delete({ where: { id } });
    return { ok: true };
  }
}
