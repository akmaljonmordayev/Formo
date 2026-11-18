import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(200)
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/, { message: 'Expo push token noto‘g‘ri' })
  token: string;

  @ApiPropertyOptional({ enum: ['uz', 'uzn', 'uzc', 'ru', 'en'], description: 'Ilova tili — bildirishnoma matni shu tilda' })
  @IsOptional()
  @IsIn(['uz', 'uzn', 'uzc', 'ru', 'en'])
  language?: string;

  @ApiPropertyOptional({ enum: ['ios', 'android'] })
  @IsOptional()
  @IsIn(['ios', 'android'])
  platform?: string;
}

export class RemovePushTokenDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  token: string;
}
