import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const prisma = { $queryRaw: jest.fn() };
  const controller = new HealthController(prisma as unknown as PrismaService);

  it('baza javob bersa — ok', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await expect(controller.check()).resolves.toEqual({ status: 'ok', uptime: expect.any(Number) });
  });

  it('baza ishlamasa — 503 (ichki xato matni chiqmaydi)', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
    const error = await controller.check().catch((e) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).not.toMatch(/ECONNREFUSED/);
  });
});
