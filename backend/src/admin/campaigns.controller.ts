import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@ApiTags('Admin · Kampaniyalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: "Kampaniyalar ro'yxati va jami ko'rsatkichlar" })
  @ApiOkResponse()
  list() {
    return this.campaigns.list();
  }

  @Post()
  @ApiOperation({ summary: 'Yangi kampaniya' })
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.campaigns.create(dto, user, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kampaniyani tahrirlash' })
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.campaigns.update(id, dto, user, req.ip);
  }
}
