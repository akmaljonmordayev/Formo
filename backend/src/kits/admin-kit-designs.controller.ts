import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateKitDesignDto, UpdateKitDesignDto, UploadQueryDto } from './dto/kit-design.dto';
import { KitDesignsService, MAX_IMAGE_BYTES, MAX_THUMBNAIL_BYTES, UploadedImage } from './kit-designs.service';

// `dest` berilmagani uchun fayl xotirada (diskka vaqtinchalik yozilmaydi); limitdan katta bo'lsa 413
const fileUpload = (max: number) => FileInterceptor('file', { limits: { fileSize: max, files: 1, fields: 0 } });

const FILE_BODY = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] },
};

@ApiTags('Admin · 3D formalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/kit-designs')
export class AdminKitDesignsController {
  constructor(private readonly designs: KitDesignsService) {}

  @Get()
  @ApiOperation({ summary: "Barcha 3D dizaynlar (nashr qilinmaganlari ham), tartib bo'yicha" })
  list() {
    return this.designs.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta dizayn' })
  get(@Param('id', ParseIdPipe) id: number) {
    return this.designs.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi dizayn (isActive=false — qoralama)' })
  create(@Body() dto: CreateKitDesignDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.designs.create(dto, user, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Tahrirlash, nashr qilish (isActive) yoki tartib" })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateKitDesignDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.designs.update(id, dto, user, req.ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: "O'chirish (buyurtmalardagi nusxa saqlanib qoladi)" })
  remove(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.designs.remove(id, user, req.ip);
  }

  @Post('uploads')
  @UseInterceptors(fileUpload(MAX_IMAGE_BYTES))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Nishon yoki homiy rasmi (PNG/JPEG/WEBP, 2 MB gacha) → { url }' })
  upload(@Query() query: UploadQueryDto, @UploadedFile() file?: UploadedImage) {
    return this.designs.upload(query.kind, file);
  }

  @Put(':id/thumbnail')
  @UseInterceptors(fileUpload(MAX_THUMBNAIL_BYTES))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: "Ro'yxat uchun kichik rasm (tahrirlovchi chizgan PNG, 1 MB gacha)" })
  thumbnail(@Param('id', ParseIdPipe) id: number, @UploadedFile() file?: UploadedImage) {
    return this.designs.setThumbnail(id, file);
  }
}
