import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/api  ·  Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap().catch((err) => {
  // Muhit sozlamalari yoki baza xatosi — aniq xabar bilan to'xtaymiz (Railway deploy logida ko'rinadi)
  Logger.error(err instanceof Error ? err.message : err, undefined, 'Bootstrap');
  process.exit(1);
});
