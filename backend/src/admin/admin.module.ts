import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountsService } from './accounts.service';
import { DiagnosticsController } from './diagnostics.controller';
import { OperatorController } from './operator.controller';
import { UsersController } from './users.controller';
import { WorkshopsController } from './workshops.controller';

@Module({
  imports: [AuthModule],
  controllers: [OperatorController, WorkshopsController, UsersController, DiagnosticsController],
  providers: [AccountsService],
})
export class AdminModule {}
