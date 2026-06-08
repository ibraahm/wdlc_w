import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { AgentsService } from './agents.service';
import { GeocodeService } from './geocode.service';
import { LocationsService } from './locations.service';
import { AgentsPublicController } from './agents-public.controller';
import { AgentsPortalController } from './agents-portal.controller';
import { AgentsAdminController } from './agents-admin.controller';
import { LocationsAdminController } from './locations-admin.controller';

@Module({
  imports: [PassportModule, AuditModule],
  controllers: [
    AgentsPublicController,
    AgentsPortalController,
    AgentsAdminController,
    LocationsAdminController,
  ],
  providers: [AgentsService, GeocodeService, LocationsService],
})
export class AgentsModule {}
