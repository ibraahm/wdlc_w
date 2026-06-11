import { Module } from '@nestjs/common';
import { PageService } from './page.service';
import { PageController } from './page.controller';
import { NavService } from './nav.service';
import { NavController } from './nav.controller';
import { SettingService } from './setting.service';
import { SettingController } from './setting.controller';
import { FormService } from './form.service';
import { FormController } from './form.controller';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [PageController, NavController, SettingController, FormController, PartnerController, NetworkController, NewsController],
  providers: [PageService, NavService, SettingService, FormService, PartnerService, NetworkService, NewsService],
})
export class CmsModule {}
