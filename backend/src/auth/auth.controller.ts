import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, ClientInfo } from './auth.service';
import { AuthResponseDto, MessageResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

const AUTH_LIMIT = { default: { limit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 10), ttl: 60_000 } };

const clientInfo = (req: Request): ClientInfo => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('register')
  @ApiOperation({ summary: "Mobil ilova: foydalanuvchi ro'yxatdan o'tishi (role = USER)" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Telefon raqam band' })
  @ApiTooManyRequestsResponse({ description: "Juda ko'p urinish" })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, clientInfo(req));
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Telefon + parol bilan kirish',
    description:
      'Barcha rollar uchun bitta endpoint: SUPERADMIN, OPERATOR, TAILOR (tikuv sexi) va USER. ' +
      'Javobdagi user.role orqali klient qaysi panelga yo‘naltirishni hal qiladi.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Telefon raqam yoki parol noto'g'ri" })
  @ApiForbiddenResponse({ description: 'Akkaunt bloklangan' })
  @ApiTooManyRequestsResponse({ description: "Juda ko'p urinish" })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, clientInfo(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access tokenni yangilash (refresh token rotatsiyasi bilan)' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessiya tugagan yoki token yaroqsiz' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Joriy qurilmadan chiqish (sessiya bekor qilinadi)' })
  @ApiOkResponse({ type: MessageResponseDto })
  logout(@CurrentUser() user: AuthUser) {
    return this.auth.logout(user.sessionId);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Barcha qurilmalardan chiqish' })
  @ApiOkResponse({ type: MessageResponseDto })
  logoutAll(@CurrentUser() user: AuthUser) {
    return this.auth.logoutAll(user.id);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi' })
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @ApiBearerAuth()
  @Patch('password')
  @ApiOperation({ summary: "O'z parolini almashtirish (boshqa qurilmalar chiqarib yuboriladi)" })
  @ApiOkResponse({ type: MessageResponseDto })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, user.sessionId, dto);
  }
}
