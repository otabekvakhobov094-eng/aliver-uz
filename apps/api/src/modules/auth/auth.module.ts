import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokensService],
  // JwtAuthGuard global APP_GUARD sifatida AppModule kontekstida yaratiladi.
  // Shu sabab JwtService ham ota modulga eksport qilinishi kerak.
  exports: [JwtModule, AuthService, OtpService, TokensService],
})
export class AuthModule {}
