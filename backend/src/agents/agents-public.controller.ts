import { Controller, Get } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { LocationsService } from './locations.service';

// Unauthenticated endpoint powering the public "Find an Agent" map + list.
@Controller('agents')
export class AgentsPublicController {
  constructor(private agents: AgentsService, private locs: LocationsService) {}

  @Get('locations')
  async listLocations() {
    const [portal, imported] = await Promise.all([
      this.agents.listPublicLocations(),
      this.locs.listPublic(),
    ]);
    return [
      ...portal.map((a) => ({ ...a, source: 'portal' as const })),
      ...imported.map((l) => ({ ...l, source: 'imported' as const })),
    ];
  }
}
