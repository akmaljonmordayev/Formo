import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { MessageResponseDto, UserResponseDto } from '../auth/dto/auth-response.dto';
import { AccountsService } from './accounts.service';
import { CreateWorkshopDto, ListQueryDto, UpdateWorkshopDto } from './dto/account.dto';
import { PaginatedUsersDto } from './dto/paginated.dto';

@ApiTags('Admin · Tikuv sexlari')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/workshops')
export class WorkshopsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.OPERATOR)
  @ApiOperation({ summary: "Tikuv sexlari ro'yxati (SUPERADMIN, OPERATOR)" })
  @ApiOkResponse({ type: PaginatedUsersDto })
  list(@Query() query: ListQueryDto) {
    return this.accounts.list(Role.TAILOR, query);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Tikuv sexi (SUPERADMIN, OPERATOR)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.accounts.findOne(Role.TAILOR, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tikuv sexi akkauntini yaratish' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Telefon raqam band' })
  create(@Body() dto: CreateWorkshopDto) {
    return this.accounts.create(Role.TAILOR, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Tahrirlash / parolni almashtirish / bloklash' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateWorkshopDto) {
    return this.accounts.update(Role.TAILOR, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Tikuv sexini o'chirish" })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse()
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.accounts.remove(Role.TAILOR, id);
  }
}
