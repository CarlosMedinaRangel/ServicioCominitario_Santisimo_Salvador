import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { EmpleadosModule } from './empleados/empleados.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BasicReportsModule } from './basic-reports/basic-reports.module';
import { PrinterModule } from './printer/printer.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CryptoModule } from './crypto/crypto.module';
import { DocumentsModule } from './documents/documents.module';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30, // Global baseline: 30 requests per minute
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT!,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: ['error'],

      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: process.env.NODE_ENV === 'production',
    }),

    EmpleadosModule,

    BasicReportsModule,

    PrinterModule,

    AuthModule,
    // 🛡️ SEGURIDAD: SeedModule solo se monta en desarrollo local. En producción no existe en el router.
    ...(process.env.NODE_ENV === 'development' ? [SeedModule] : []),
    CloudinaryModule,
    CryptoModule,
    DocumentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
