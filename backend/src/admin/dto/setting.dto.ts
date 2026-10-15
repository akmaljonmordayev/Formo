import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpdateSettingDto {
  // Qiymat erkin JSON (obyekt yoki massiv — masalan yetkazish slotlari). Shakli key'ga qarab frontendda tekshiriladi.
  @ApiProperty({ description: "Sozlama qiymati (erkin JSON: obyekt yoki massiv)" })
  @IsDefined()
  value: unknown;
}
