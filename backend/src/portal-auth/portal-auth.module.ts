import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PortalAuthService } from './portal-auth.service';
import { PortalAuthController } from './portal-auth.controller';
import { PortalJwtStrategy } from './portal-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [PortalAuthController],
  providers: [PortalAuthService, PortalJwtStrategy],
  exports: [PortalAuthService],
})
export class PortalAuthModule {}
