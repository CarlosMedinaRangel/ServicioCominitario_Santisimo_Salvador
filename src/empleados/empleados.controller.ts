import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  ParseFilePipeBuilder,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import type { Response } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Employee } from './entities/employee.entity';
import { Auth } from 'src/auth/Decorators/auth.decorator';

@ApiTags('empleados')
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Post()
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar un nuevo empleado' })
  @ApiResponse({
    status: 201,
    description: 'Empleado creado exitosamente',
    type: Employee,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validaciones de DTO fallidas.',
  })
  @ApiResponse({
    status: 401,
    description: 'Acceso denegado, Token inválido o ausente.',
  })
  create(@Body() createEmpleadoDto: CreateEmpleadoDto) {
    return this.empleadosService.create(createEmpleadoDto);
  }

  @Post('upload')
  @Auth()
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Cargar archivo Excel/CSV con datos de empleados' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo Excel/CSV + mapeo de columnas en JSON',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        mapping: {
          type: 'string',
          description:
            'JSON con el mapeo: {"campo": "indice_columna", ...}',
        },
        sheetName: {
          type: 'string',
          description: 'Nombre de la hoja utilizada',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Archivo procesado. Retorna resumen de inserciones/actualizaciones.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        created: { type: 'number' },
        updated: { type: 'number' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              row: { type: 'number' },
              field: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /(application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|text\/csv|application\/csv)/,
        })
        .addMaxSizeValidator({ maxSize: 50 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @Body('mapping') mappingRaw: string,
  ) {
    let mapping: Record<string, number>;
    try {
      const parsed = JSON.parse(mappingRaw);
      mapping = {} as Record<string, number>;
      for (const [key, val] of Object.entries(parsed)) {
        mapping[key] = Number(val);
      }
    } catch {
      throw new BadRequestException(
        'El campo "mapping" debe ser un JSON válido',
      );
    }
    return this.empleadosService.uploadFile(file, mapping);
  }

  @Get()
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener la lista de todos los empleados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados obtenida con éxito.',
    type: [Employee],
  })
  findAll() {
    return this.empleadosService.findAll();
  }

  @Get(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener la información de un empleado específico' })
  @ApiParam({
    name: 'id',
    description: 'UUID del usuario, cédula o nombre del empleado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado encontrado con éxito.',
    type: Employee,
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado.',
  })
  findOne(@Param('id') id: string) {
    return this.empleadosService.findOne(id);
  }

  @Get(':id/schedules')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener horarios de un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Horarios del empleado.',
  })
  findSchedules(@Param('id') id: string) {
    return this.empleadosService.findSchedules(id);
  }

  @Get(':id/groups')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener grupos de un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Grupos del empleado.',
  })
  findGroups(@Param('id') id: string) {
    return this.empleadosService.findGroups(id);
  }

  @Get(':id/activities')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener actividades de un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Actividades del empleado.',
  })
  findActivities(@Param('id') id: string) {
    return this.empleadosService.findActivities(id);
  }

  @Post(':id/activities/seed')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar actividades de prueba para un empleado en un mes' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Mes en formato YYYY-MM (default: mes actual)',
    example: '2026-07',
  })
  @ApiResponse({
    status: 201,
    description: 'Actividades de prueba generadas.',
  })
  seedActivities(
    @Param('id') id: string,
    @Query('month') month?: string,
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.empleadosService.seedActivities(id, targetMonth);
  }

  @Get('Constancia-Empleado/:id')
  @ApiOperation({ summary: 'Descargar constancia de trabajo en formato PDF. Opcional: ?month=YYYY-MM para incluir actividades del mes.' })
  @ApiParam({
    name: 'id',
    description: 'UUID (userId) o cédula del empleado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Mes en formato YYYY-MM para incluir actividades del periodo',
    example: '2026-07',
  })
  @ApiQuery({
    name: 'employerName',
    required: false,
    description: 'Nombre de quien firma (default: Carlos Medina)',
    example: 'Maria Lopez',
  })
  @ApiQuery({
    name: 'employerPosition',
    required: false,
    description: 'Cargo de quien firma (default: Director)',
    example: 'Subdirectora',
  })
  @ApiQuery({
    name: 'employerCompany',
    required: false,
    description: 'Nombre de la institución (default: Santisimo Salvador)',
    example: 'Colegio Santisimo Salvador',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description:
      'Archivo PDF de la constancia de trabajo generado correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado para generar la constancia.',
  })
  async ConstanciaEmpleadoByID(
    @Res() response: Response,
    @Param('id') id: string,
    @Query('month') month?: string,
    @Query('employerName') employerName?: string,
    @Query('employerPosition') employerPosition?: string,
    @Query('employerCompany') employerCompany?: string,
  ) {
    const pdfDoc = await this.empleadosService.ConstanciaEmpleadoByID(id, {
      month,
      employerName,
      employerPosition,
      employerCompany,
    });

    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = month ? `constancia-${month}.pdf` : 'employment-letter.pdf';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Patch(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar los datos de un empleado' })
  @ApiParam({
    name: 'id',
    description: 'UUID del empleado a actualizar',
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado actualizado correctamente.',
    type: Employee,
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado.',
  })
  update(
    @Param('id') id: string,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
  ) {
    return this.empleadosService.update(id, updateEmpleadoDto);
  }

  @Delete(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un empleado' })
  @ApiParam({
    name: 'id',
    description: 'UUID del empleado a eliminar',
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado eliminado correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado.',
  })
  remove(@Param('id') id: string) {
    return this.empleadosService.remove(id);
  }
}
