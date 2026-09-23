import { Controller, Get } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/auth/Decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reiniciar y poblar la base de datos con datos de prueba (Solo Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Base de datos poblada exitosamente.',
  })
  executeSeed() {
    return this.seedService.runSeed();
  }
}

