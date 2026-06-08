import { Body, Controller, Delete, ForbiddenException, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SettingService } from './setting.service';
import { UpsertSettingDto } from './dto/setting.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

// Keys visible to anonymous requests; all other keys require admin auth
const PUBLIC_SETTING_KEYS = new Set([
  'siteName',
  'siteTagline',
  'nmls',
  'contactEmail',
  'contactPhone',
  'application.draftTimeoutMinutes',
  'recaptchaSiteKey',
  'maintenanceMode',
  'footerText',
]);

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('cms/settings')
export class SettingController {
  constructor(private settings: SettingService) {}

  @Public()
  @Get()
  async getAll() {
    const all = await this.settings.getAll() as { key: string; value: string }[];
    return all.filter((s) => PUBLIC_SETTING_KEYS.has(s.key));
  }

  @Public()
  @Get(':key')
  async get(@Param('key') key: string) {
    if (!PUBLIC_SETTING_KEYS.has(key)) {
      throw new ForbiddenException('Not a public setting');
    }
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
