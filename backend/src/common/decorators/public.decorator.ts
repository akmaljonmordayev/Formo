import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Global JWT guard'dan ozod qilingan endpoint */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
