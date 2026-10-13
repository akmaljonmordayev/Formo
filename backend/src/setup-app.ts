import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { basicAuth } from './common/middleware/basic-auth';
import { clientIpFromHeader } from './common/middleware/client-ip';
import { buildCloudflareList, cloudflareOnly } from './common/middleware/cloudflare-only';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { parseCorsOrigins, parseTrustProxy } from './config/http.config';

/** main.ts va e2e testlar bir xil konfiguratsiyani ishlatadi */
export function setupApp(app: INestApplication) {
  const express = app as NestExpressApplication;
  express.disable('x-powered-by');
  // Proxy ortida (Railway) req.ip haqiqiy klient manzili bo'lishi uchun — rate-limit shunga tayanadi
  express.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV));
  // Proxy klient IP sini alohida headerda bersa (Railway: X-Real-IP) — hop sanashdan ishonchliroq
  if (process.env.CLIENT_IP_HEADER) app.use(clientIpFromHeader(process.env.CLIENT_IP_HEADER));
  // Cloudflare'ni chetlab origin'ga to'g'ridan-to'g'ri kelgan so'rovlar rad etiladi.
  // /api/health ochiq qoladi — Railway healthcheck'i ichkaridan, Cloudflare'siz keladi.
  if (process.env.REQUIRE_CLOUDFLARE === 'true') {
    const extra = (process.env.CLOUDFLARE_EXTRA_RANGES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    app.use(cloudflareOnly(buildCloudflareList(extra), ['/api/health']));
  }
  express.useBodyParser('json', { limit: '100kb' });

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: parseCorsOrigins(process.env.FRONTEND_URL),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO da yo'q maydonlar olib tashlanadi (masalan, role: SUPERADMIN)
      forbidNonWhitelisted: true, // ...va xato qaytariladi
      transform: true,
      stopAtFirstError: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Productionda standart holatda o'chiq (SWAGGER_ENABLED=true bilan yoqiladi)
  const swaggerDefault = process.env.NODE_ENV === 'production' ? 'false' : 'true';
  if ((process.env.SWAGGER_ENABLED ?? swaggerDefault) === 'true') {
    // SWAGGER_PASSWORD berilsa hujjat sahifasi va uning JSON/YAML sxemasi login/parol bilan yopiladi
    if (process.env.SWAGGER_PASSWORD) {
      app.use(
        ['/api/docs', '/api/docs-json', '/api/docs-yaml'],
        basicAuth(process.env.SWAGGER_USER || 'formo', process.env.SWAGGER_PASSWORD),
      );
    }
    const config = new DocumentBuilder()
      .setTitle('Formo API')
      .setDescription(
        'Formo — maxsus futbol formalari platformasi.\n\n' +
          '**Rollar:** SUPERADMIN (yagona), OPERATOR (yagona), TAILOR (tikuv sexlari), USER (mobil ilova).\n\n' +
          "Kirish: `POST /api/auth/login` → `accessToken` ni yuqoridagi **Authorize** tugmasiga qo'ying.",
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config), {
      swaggerOptions: { persistAuthorization: true },
    });
  }
  return app;
}
