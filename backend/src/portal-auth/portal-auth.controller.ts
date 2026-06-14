import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PortalAuthService } from './portal-auth.service';
import {
  AgentSignupDto,
  AgentLoginDto,
  AgentRefreshDto,
  AgentForgotPasswordDto,
  AgentResetPasswordDto,
  AgentChangePasswordDto,
  VerifyEmailDto,
  ResendVerifyDto,
  GoogleLoginDto,
} from './dto/portal-auth.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PortalJwtAuthGuard } from './portal-jwt-auth.guard';
import { HumanVerificationService } from '../common/human-verification.service';
import { ForbiddenException } from '@nestjs/common';

@UseGuards(PortalJwtAuthGuard)
@Controller('portal/auth')
export class PortalAuthController {
  constructor(
    private auth: PortalAuthService,
    private humanVerification: HumanVerificationService,
  ) {}

  // ── Public ────────────────────────────────────────────────────────────────

  // Public signup removed — portal accounts are issued automatically when an
  // agent application is approved (or a teller application for a branch).

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: AgentLoginDto, @Req() req: Request) {
    if (!this.humanVerification.verify(dto.humanVerificationToken, dto.humanVerificationAnswer, 'portal_login'))
      throw new ForbiddenException('Security check failed. Please answer the verification question.');
    return this.auth.login(dto.email, dto.password, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  refresh(@Body() dto: AgentRefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, req.ip, req.headers['user-agent']);
  }

  // Google sign-in: authenticates an already-approved account via a Google ID
  // token. No human-verification needed — the token is a cryptographic proof.
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('google')
  google(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.auth.loginWithGoogle(dto.credential, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 3 } })
  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerifyDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 3 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: AgentForgotPasswordDto) {
    if (!this.humanVerification.verify(dto.humanVerificationToken, dto.humanVerificationAnswer, 'portal_forgot_password'))
      throw new ForbiddenException('Security check failed. Please answer the verification question.');
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: AgentResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  // ── Authenticated ─────────────────────────────────────────────────────────

  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  @Post('logout')
  logout(@Body() dto: AgentRefreshDto, @CurrentUser('id') id: string) {
    return this.auth.logout(dto.refreshToken, id);
  }

  @Post('change-password')
  changePassword(@CurrentUser('id') id: string, @Body() dto: AgentChangePasswordDto) {
    return this.auth.changePassword(id, dto);
  }

  @Get('login-history')
  loginHistory(@CurrentUser('id') id: string) {
    return this.auth.getLoginHistory(id);
  }
}
