import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { KitDesignsService } from './kit-designs.service';

@ApiTags('Mobil · 3D dizaynlar')
@Controller('kits/designs')
export class KitDesignsController {
  constructor(private readonly designs: KitDesignsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Nashr qilingan 3D dizaynlar (tartib bo'yicha) va server narxlari" })
  @ApiOkResponse({ description: '[{ id, name, thumbnailUrl, design: { designVersion: 1, ... }, prices: { shirt, shorts, print } }]' })
  list() {
    return this.designs.listPublished();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Bitta nashr qilingan dizayn' })
  @ApiNotFoundResponse({ description: 'Topilmadi yoki nashr qilinmagan' })
  get(@Param('id', ParseIdPipe) id: number) {
    return this.designs.getPublished(id);
  }
}
