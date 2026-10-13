import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../auth/dto/auth-response.dto';

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserResponseDto] }) items: UserResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
