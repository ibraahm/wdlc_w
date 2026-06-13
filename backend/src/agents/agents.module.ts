import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { AgentsService } from './agents.service';
import { GeocodeService } from './geocode.service';
import { LocationsService } from './locations.service';
import { ApplicationsService } from './applications.service';
import { DDService } from './dd.service';
import { DDCronService } from './dd-cron.service';
import { AgentsPublicController } from './agents-public.controller';
import { AgentsPortalController } from './agents-portal.controller';
import { AgentsAdminController } from './agents-admin.controller';
import { LocationsAdminController } from './locations-admin.controller';
import { ApplicationsPublicController } from './applications-public.controller';
import { ApplicationsAdminController } from './applications-admin.controller';
import { DDAdminController } from './dd-admin.controller';
import { TellersService } from './tellers.service';
import { TellersPublicController, TellersAdminController } from './tellers.controller';

@Module({
  imports: [PassportModule, AuditModule],
  controllers: [
    AgentsPublicController,
    AgentsPortalController,
    AgentsAdminController,
    LocationsAdminController,
    ApplicationsPublicController,
    ApplicationsAdminController,
    DDAdminController,
    TellersPublicController,
    TellersAdminController,
  ],
  providers: [AgentsService, GeocodeService, LocationsService, ApplicationsService, DDService, DDCronService, TellersService],
})
export class AgentsModule {}
