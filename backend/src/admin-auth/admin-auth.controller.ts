import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminLoginDto,
  AdminCreateUserDto,
  AdminRefreshDto,
  AdminForgotPasswordDto,
  AdminResetPasswordDto,
  AdminChangePasswordDto,
  AdminSetActiveDto,
} from './dto/admin-auth.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RecaptchaService } from '../common/recaptcha.service';

// All routes use the admin JWT guard; RolesGuard enforces the @Roles() on
// user-management endpoints (without it those decorators are inert).
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private auth: AdminAuthService,
    private recaptcha: RecaptchaService,
  ) {}

  // ── Public endpoints ──────────────────────────────────────────────────────

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    if (!(await this.recaptcha.verify(dto.recaptchaToken, 'admin_login')))
      throw new ForbiddenException('Security check failed. Please try again.');
    return this.auth.login(dto.email, dto.password, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  refresh(@Body() dto: AdminRefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 3 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: AdminForgotPasswordDto) {
    if (!(await this.recaptcha.verify(dto.recaptchaToken, 'admin_forgot_password')))
      throw new ForbiddenException('Security check failed. Please try again.');
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  // ── Authenticated endpoints ───────────────────────────────────────────────

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post('logout')
  logout(@Body() dto: AdminRefreshDto, @CurrentUser('id') id: string) {
    return this.auth.logout(dto.refreshToken, id);
  }

  @Post('change-password')
  changePassword(@CurrentUser('id') id: string, @Body() dto: AdminChangePasswordDto) {
    return this.auth.changePassword(id, dto.currentPassword, dto.newPassword);
  }

  // ── SUPER_ADMIN only ──────────────────────────────────────────────────────

  @Roles('SUPER_ADMIN')
  @Get('users')
  listUsers() {
    return this.auth.listUsers();
  }

  @Roles('SUPER_ADMIN')
  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto, @CurrentUser('id') id: string) {
    return this.auth.createUser(dto, id);
  }

  @Roles('SUPER_ADMIN')
  @Patch('users/:id/active')
  setActive(
    @Param('id') targetId: string,
    @Body() dto: AdminSetActiveDto,
    @CurrentUser('id') id: string,
  ) {
    return this.auth.setUserActive(targetId, dto.active, id);
  }
}
