import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpsertPricingDto } from './dto/pricing.dto';
import { PricingService } from './pricing.service';

@ApiTags('Admin · Narxlar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  @ApiOperation({ summary: "Narx jadvali (mijozga ko'rsatiladigan narx shu yerdan hisoblanadi)" })
  @ApiOkResponse()
  list() {
    return this.pricing.list();
  }

  @Put()
  @ApiOperation({ summary: "Narxlarni saqlash" })
  upsert(@Body() dto: UpsertPricingDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.pricing.upsert(dto, user, req.ip);
  }
}
