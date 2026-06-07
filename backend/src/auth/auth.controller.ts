import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, CreateUserDto, ChangePasswordDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // 5 attempts / 60s per IP — much stricter than the global 100/min
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, req.ip, req.headers['user-agent']);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post('change-password')
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(userId, dto);
  }

  @Roles('SUPER_ADMIN')
  @Get('users')
  listUsers() {
    return this.auth.listUsers();
  }

  @Roles('SUPER_ADMIN')
  @Post('users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: string) {
    return this.auth.createUser(dto, actorId);
  }
}
