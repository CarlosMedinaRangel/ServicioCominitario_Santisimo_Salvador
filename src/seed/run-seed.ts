import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function runStandaloneSeed() {
  console.log('🌱 Iniciando carga de datos semilla (Database Seeder)...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const seedService = app.get(SeedService);
    const result = await seedService.runSeed();
    console.log('✅ Base de datos poblada exitosamente:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error al ejecutar el seeder:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runStandaloneSeed();
