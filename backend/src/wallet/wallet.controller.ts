import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WalletService } from './wallet.service';

@ApiTags('Mobil · Balans')
@ApiBearerAuth()
@Roles(Role.USER)
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Balans va oxirgi harakatlar' })
  async summary(@CurrentUser() user: AuthUser) {
    return this.wallet.summary(user.id);
  }

}
