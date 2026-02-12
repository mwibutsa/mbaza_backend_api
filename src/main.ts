import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
// import helmet from 'helmet';

import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable raw WebSocket adapter for Twilio Media Streams
  app.useWebSocketAdapter(new WsAdapter(app));

  app.enableCors();
  // app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Mbaza API')
    .setDescription('Mbaza AI-Powered Citizen Call Center API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Mbaza API running on port ${port}`);
  console.log(`📞 Voice webhook: POST /api/v1/voice/incoming-call`);
  console.log(`🔌 WebSocket stream: ws://localhost:${port}/audio-stream`);
}
bootstrap().catch((e) => console.error(e));
