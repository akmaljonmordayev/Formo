import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
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
import { MessageResponseDto, UserResponseDto } from '../auth/dto/auth-response.dto';
import { AccountsService } from './accounts.service';
import { CreateOperatorDto, UpdateOperatorDto } from './dto/account.dto';

/** Operator — yagona akkaunt, shuning uchun singular resurs (id siz) */
@ApiTags('Admin · Operator')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat SUPERADMIN' })
@Roles(Role.SUPERADMIN)
@Controller('admin/operator')
export class OperatorController {
  constructor(private readonly accounts: AccountsService) {}

  private async operatorId() {
    return (await this.accounts.findSingle(Role.OPERATOR)).id;
  }

  @Get()
  @ApiOperation({ summary: "Operator akkauntini ko'rish" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Operator hali yaratilmagan' })
  get() {
    return this.accounts.findSingle(Role.OPERATOR);
  }

  @Post()
  @ApiOperation({ summary: 'Operator akkauntini yaratish (faqat bitta bo‘lishi mumkin)' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Operator allaqachon mavjud yoki telefon band' })
  create(@Body() dto: CreateOperatorDto) {
    return this.accounts.createSingle(Role.OPERATOR, dto);
  }

  @Patch()
  @ApiOperation({ summary: 'Operatorni tahrirlash / parolni almashtirish / bloklash' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(@Body() dto: UpdateOperatorDto) {
    return this.accounts.update(Role.OPERATOR, await this.operatorId(), dto);
  }

  @Delete()
  @ApiOperation({ summary: "Operator akkauntini o'chirish" })
  @ApiOkResponse({ type: MessageResponseDto })
  async remove() {
    return this.accounts.remove(Role.OPERATOR, await this.operatorId());
  }
}
