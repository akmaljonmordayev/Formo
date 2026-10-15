import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ClubsService } from './clubs.service';
import { CreateClubDto, ListClubsQueryDto, UpdateClubDto, UpdateKitDto } from './dto/club.dto';

@ApiTags('Admin · Klublar va formalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/clubs')
export class ClubsController {
  constructor(private readonly clubs: ClubsService) {}

  @Get()
  @ApiOperation({ summary: "Klublar katalogi (uy/mehmon/uchinchi formalari bilan)" })
  @ApiOkResponse()
  list(@Query() query: ListClubsQueryDto) {
    return this.clubs.list(query);
  }

  @Post()
  @ApiOperation({ summary: "Yangi klub va uning formalarini qo'shish" })
  create(@Body() dto: CreateClubDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.clubs.create(dto, user, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Klubni tahrirlash" })
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateClubDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.clubs.update(id, dto, user, req.ip);
  }

  @Patch('kits/:kitId')
  @ApiOperation({ summary: "Bitta formani tahrirlash (narx, o'lchamlar, sotuvda/yo'q)" })
  updateKit(
    @Param('kitId', ParseIdPipe) kitId: number,
    @Body() dto: UpdateKitDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.clubs.updateKit(kitId, dto, user, req.ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Klubni o'chirish" })
  remove(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.clubs.remove(id, user, req.ip);
  }
}
