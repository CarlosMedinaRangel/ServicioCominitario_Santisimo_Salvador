import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const isDebug = process.env.NEST_DEBUG === 'true';

  // Reduce bootstrap noise unless NEST_DEBUG=true is explicitly set
  const app = await NestFactory.create(AppModule, {
    logger: isDebug ? ['log', 'error', 'warn', 'debug', 'verbose'] : ['error', 'warn'],
  });

  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api/');

  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Servicio Comunitario RESTFul API')
    .setDescription('Servicio Comunitario EndPoints')
    .setVersion('0.3')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory, {
    swaggerOptions: {
      withCredentials: true,
      persistAuthorization: true,
    },
  });

  const port = process.env.BACKEND_PORT || process.env.PORT || 3000;
  const devHost = process.env.DEV_HOST || 'localhost';

  if (devHost === 'localhost') {
    await app.listen(port);
  } else {
    await app.listen(port, '0.0.0.0');
  }

  const hostUrl = `http://${devHost === 'localhost' ? 'localhost' : '0.0.0.0'}:${port}`;
  console.log(`\n\x1b[36m🚀 NestJS backend listo en:\x1b[0m \x1b[32m${hostUrl}/api\x1b[0m`);
  console.log(`\x1b[36m📚 Swagger docs disponibles en:\x1b[0m \x1b[34m${hostUrl}/docs\x1b[0m\n`);
}
bootstrap();
