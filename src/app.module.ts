import { Module } from '@nestjs/common';
import { EmpleadosModule } from './empleados/empleados.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BasicReportsModule } from './basic-reports/basic-reports.module';
import { PrinterModule } from './printer/printer.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT!,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: true,
      logging: ['migration', 'error'],

      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),

    EmpleadosModule,

    BasicReportsModule,

    PrinterModule,
  ],
})
export class AppModule {}
