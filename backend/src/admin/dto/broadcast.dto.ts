import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

export class BroadcastDto {
  @ApiProperty({ example: "Hurmatli mijozlar! Ertaga bayram munosabati bilan buyurtmalar bir kunga kechikadi." })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(2000)
  message: string;
}
