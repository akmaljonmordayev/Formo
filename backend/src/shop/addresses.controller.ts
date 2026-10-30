import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@ApiTags('Mobil · Manzillar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat mobil ilova foydalanuvchisi' })
@Roles(Role.USER)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Saqlangan manzillarim (asosiysi birinchi)' })
  list(@CurrentUser() user: AuthUser) {
    return this.addresses.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Manzil qo‘shish (birinchi manzil avtomatik asosiy bo‘ladi)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.addresses.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Manzilni tahrirlash / asosiy qilish' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number, @Body() dto: UpdateAddressDto) {
    return this.addresses.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Manzilni o‘chirish' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.addresses.remove(user.id, id);
  }
}
