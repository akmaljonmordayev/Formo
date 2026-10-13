import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** Prisma xatolarini toza HTTP javobga aylantiradi (ichki SQL tafsilotlari tashqariga chiqmaydi) */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const code = exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : 'VALIDATION';

    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, "Bu ma'lumot allaqachon mavjud"],
      P2025: [HttpStatus.NOT_FOUND, 'Topilmadi'],
      P2034: [HttpStatus.CONFLICT, "Bir vaqtda o'zgartirish, qayta urinib ko'ring"],
      VALIDATION: [HttpStatus.BAD_REQUEST, "So'rov noto'g'ri"],
    };
    const [status, message] = map[code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Serverda xatolik yuz berdi'];
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(exception.message);

    res.status(status).json({ statusCode: status, message });
  }
}
