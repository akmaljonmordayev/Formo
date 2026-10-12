import { ArgumentsHost, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('SELECT * FROM "User" -- ichki tafsilot', { code, clientVersion: 'test' });

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  let logError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2034', 409],
  ])('%s -> %d', (code, expected) => {
    filter.catch(knownError(code), host);
    expect(status).toHaveBeenCalledWith(expected);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: expected }));
    expect(logError).not.toHaveBeenCalled();
  });

  it('validatsiya xatosi -> 400', () => {
    filter.catch(new Prisma.PrismaClientValidationError('Invalid value', { clientVersion: 'test' }), host);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('noma’lum kod -> 500, log yoziladi, SQL tafsiloti tashqariga chiqmaydi', () => {
    filter.catch(knownError('P9999'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ statusCode: 500, message: 'Serverda xatolik yuz berdi' });
    expect(JSON.stringify(json.mock.calls)).not.toMatch(/SELECT/);
    expect(logError).toHaveBeenCalled();
  });
});
