import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const MAX_INT4 = 2_147_483_647;

/** Faqat musbat butun son (PostgreSQL INT chegarasida) — aks holda 400 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d{1,10}$/.test(value)) throw new BadRequestException("ID noto'g'ri");
    const id = Number(value);
    if (id < 1 || id > MAX_INT4) throw new BadRequestException("ID noto'g'ri");
    return id;
  }
}
