import { Injectable, Logger } from '@nestjs/common';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Free address → coordinates lookup using OpenStreetMap's Nominatim service.
 * Nominatim's usage policy requires an identifying User-Agent and a low request
 * rate; this is fine for the occasional agent profile save. No API key needed.
 */
@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly endpoint = 'https://nominatim.openstreetmap.org/search';

  async geocode(parts: {
    addressLine?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  }): Promise<GeocodeResult | null> {
    const query = [parts.addressLine, parts.city, parts.state, parts.zip, parts.country]
      .filter(Boolean)
      .join(', ')
      .trim();
    if (!query) return null;

    try {
      const url = `${this.endpoint}?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'WorldDirectLink-AgentLocator/1.0 (compliance@worlddirectlink.com)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        this.logger.warn(`Geocode HTTP ${res.status} for "${query}"`);
        return null;
      }
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!data.length) return null;
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
      return { latitude: lat, longitude: lon };
    } catch (err) {
      this.logger.warn(`Geocode failed for "${query}": ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
