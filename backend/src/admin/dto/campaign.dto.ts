import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CampaignChannel, CampaignStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Savatni unutdingiz' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Savatda qoldirganlar · 7 kun' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(200)
  audience: string;

  @ApiProperty({ enum: CampaignChannel })
  @IsEnum(CampaignChannel)
  channel: CampaignChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ example: 'Madina, formangiz savatda kutmoqda...' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.DRAFT })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}
