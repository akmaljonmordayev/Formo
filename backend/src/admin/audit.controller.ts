import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { ListAuditLogQueryDto } from './dto/audit.dto';

@ApiTags('Admin · Audit jurnali')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/audit-log')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Audit jurnali ro'yxati" })
  @ApiOkResponse()
  list(@Query() query: ListAuditLogQueryDto) {
    return this.audit.list(query);
  }
}
