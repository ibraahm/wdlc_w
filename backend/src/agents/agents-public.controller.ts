import { Controller, Get } from '@nestjs/common';
import { AgentsService } from './agents.service';

// Unauthenticated endpoint powering the public "Find an Agent" map + list.
@Controller('agents')
export class AgentsPublicController {
  constructor(private agents: AgentsService) {}

  @Get('locations')
  locations() {
    return this.agents.listPublicLocations();
  }
}
