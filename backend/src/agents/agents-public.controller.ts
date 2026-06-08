import { Controller, Get } from '@nestjs/common';
import { LocationsService } from './locations.service';

// Unauthenticated endpoint powering the public "Find an Agent" map + list.
// Single source of truth: the AgentLocation table (managed in admin).
@Controller('agents')
export class AgentsPublicController {
  constructor(private locs: LocationsService) {}

  @Get('locations')
  listLocations() {
    return this.locs.listPublic();
  }
}
