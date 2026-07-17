import { Controller, Get } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @ApiOperation({ summary: 'Reiniciar y poblar la base de datos con datos de prueba' })
  @ApiResponse({
    status: 200,
    description: 'Base de datos poblada exitosamente.',
  })
  executeSeed() {
    return this.seedService.runSeed();
  }
}
