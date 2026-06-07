import { Module } from '@nestjs/common';
import { PageService } from './page.service';
import { PageController } from './page.controller';
import { NavService } from './nav.service';
import { NavController } from './nav.controller';
import { SettingService } from './setting.service';
import { SettingController } from './setting.controller';

@Module({
  controllers: [PageController, NavController, SettingController],
  providers: [PageService, NavService, SettingService],
})
export class CmsModule {}
