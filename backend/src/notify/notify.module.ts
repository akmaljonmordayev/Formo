import { Global, Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { PushService } from './push.service';

@Global()
@Module({ providers: [NotifyService, PushService], exports: [NotifyService, PushService] })
export class NotifyModule {}
