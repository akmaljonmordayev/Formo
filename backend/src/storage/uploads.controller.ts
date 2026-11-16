import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { StorageService } from './storage.service';

/**
 * Bazada saqlangan fayllar (S3 ham, UPLOAD_DIR ham yo'q production). Lokal diskdagi fayllarni
 * setup-app.ts dagi static handler beradi — topilmasa so'rov shu yerga tushadi.
 * Ochiq: <img> Bearer yubora olmaydi; fayl nomlari tasodifiy (UUID) va o'zgarmaydi.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get(':dir/:file')
  one(@Param('dir') dir: string, @Param('file') file: string, @Res() res: Response) {
    return this.send(`${dir}/${file}`, res);
  }

  @Public()
  @Get(':dir/:sub/:file')
  nested(@Param('dir') dir: string, @Param('sub') sub: string, @Param('file') file: string, @Res() res: Response) {
    return this.send(`${dir}/${sub}/${file}`, res);
  }

  private async send(key: string, res: Response) {
    const found = await this.storage.read(key);
    if (!found) throw new NotFoundException('Fayl topilmadi');
    // Static handler bilan bir xil sarlavhalar (admin canvas va mobil WebView boshqa origin'dan yuklaydi)
    res.setHeader('Content-Type', found.contentType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(found.data);
  }
}
