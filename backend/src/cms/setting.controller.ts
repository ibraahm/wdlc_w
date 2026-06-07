import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { SettingService } from './setting.service';
import { UpsertSettingDto } from './dto/setting.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('cms/settings')
export class SettingController {
  constructor(private settings: SettingService) {}

  @Public()
  @Get()
  getAll() {
    return this.settings.getAll();
  }

  @Public()
  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Put(':key')
  set(@Param('key') key: string, @Body() dto: UpsertSettingDto, @CurrentUser() user: AuthUser) {
    return this.settings.set(key, dto.value, user.id);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':key')
  delete(@Param('key') key: string, @CurrentUser() user: AuthUser) {
    return this.settings.delete(key, user.id);
  }
}
