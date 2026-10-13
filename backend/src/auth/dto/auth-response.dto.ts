import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() phone: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty() fullName: string;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional({ enum: Gender, nullable: true }) gender: Gender | null;
  @ApiPropertyOptional({ nullable: true }) age: number | null;
  @ApiPropertyOptional({ nullable: true }) height: number | null;
  @ApiPropertyOptional({ nullable: true }) weight: number | null;
  @ApiPropertyOptional({ nullable: true }) workshopName: string | null;
  @ApiPropertyOptional({ nullable: true }) address: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Authorization: Bearer <accessToken>' })
  accessToken: string;

  @ApiProperty({ description: 'Access token muddati tugaganda /auth/refresh ga yuboriladi' })
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'OK' })
  message: string;
}
