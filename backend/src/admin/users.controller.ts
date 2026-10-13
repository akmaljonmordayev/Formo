import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { ListQueryDto, UpdateStatusDto } from './dto/account.dto';
import { PaginatedUsersDto } from './dto/paginated.dto';

/** Mobil ilova foydalanuvchilari: o'zlari ro'yxatdan o'tadi, superadmin ko'radi va bloklaydi */
@ApiTags('Admin · Mobil foydalanuvchilar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat SUPERADMIN' })
@Roles(Role.SUPERADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: "Mobil foydalanuvchilar ro'yxati" })
  @ApiOkResponse({ type: PaginatedUsersDto })
  list(@Query() query: ListQueryDto) {
    return this.accounts.list(Role.USER, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.accounts.findOne(Role.USER, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Bloklash / blokdan chiqarish' })
  @ApiOkResponse({ type: UserResponseDto })
  setStatus(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.accounts.update(Role.USER, id, { isActive: dto.isActive });
  }

  @Delete(':id')
  @ApiOkResponse({ type: MessageResponseDto })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.accounts.remove(Role.USER, id);
  }
}
