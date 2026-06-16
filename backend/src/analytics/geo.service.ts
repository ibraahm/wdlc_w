import { Injectable, Logger } from '@nestjs/common';

export interface GeoResult {
  country: string | null; // ISO 3166-1 alpha-2
  region: string | null;
  city: string | null;
}

const EMPTY: GeoResult = { country: null, region: null, city: null };

// Offline IP -> location lookup using a MaxMind GeoLite2 database, so country is
// available even when no CDN/edge geo header is present (e.g. plain nginx).
//
// Enabled by pointing GEOIP_DB_PATH at a GeoLite2-Country.mmdb (or City) file.
// The `maxmind` package and the DB file are BOTH optional: if either is missing
// the service simply returns nulls and the collector falls back to header-based
// country. We load lazily and require() dynamically so the app builds and runs
// fine without the dependency installed.
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readerPromise: Promise<{ get: (ip: string) => any } | null> | null = null;

  private load(): Promise<{ get: (ip: string) => any } | null> {
    if (this.readerPromise) return this.readerPromise;
    this.readerPromise = (async () => {
      const dbPath = process.env.GEOIP_DB_PATH;
      if (!dbPath) return null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const maxmind = require('maxmind');
        const reader = await maxmind.open(dbPath);
        this.logger.log(`GeoIP database loaded from ${dbPath}`);
        return reader;
      } catch (err) {
        this.logger.warn(
          `GeoIP disabled: could not load '${dbPath}' (${(err as Error).message}). ` +
            `Install 'maxmind' and provide a GeoLite2 .mmdb to enable offline country lookup.`,
        );
        return null;
      }
    })();
    return this.readerPromise;
  }

  async lookup(ip: string | null | undefined): Promise<GeoResult> {
    if (!ip) return EMPTY;
    const reader = await this.load();
    if (!reader) return EMPTY;
    try {
      const r = reader.get(ip);
      if (!r) return EMPTY;
      const code = r.country?.iso_code ?? r.registered_country?.iso_code ?? null;
      const region =
        Array.isArray(r.subdivisions) && r.subdivisions[0]?.iso_code
          ? String(r.subdivisions[0].iso_code)
          : null;
      const city = r.city?.names?.en ? String(r.city.names.en) : null;
      const country = code && /^[A-Za-z]{2}$/.test(code) ? String(code).toUpperCase() : null;
      return { country, region, city };
    } catch {
      return EMPTY;
    }
  }
}
