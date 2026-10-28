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
import { ValidRoles } from 'src/auth/interfaces';

import 'multer';
import { GetUser } from 'src/auth/Decorators/get-user.decorator';
import { User } from 'src/auth/entities/auth.entity';

@ApiTags('empleados')
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Post()
  @Auth(ValidRoles.admin)
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
  @Auth(ValidRoles.admin)
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
          description: 'JSON con el mapeo: {"campo": "indice_columna", ...}',
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

  @Patch('me')
  @Auth() // cualquier usuario autenticado, sin rol
  @ApiOperation({ summary: 'Actualizar mis propios datos de empleado' })
  @ApiResponse({ status: 200, description: 'Datos actualizados correctamente' })
  @ApiResponse({
    status: 404,
    description: 'No tienes datos de empleado registrados',
  })
  async updateMyEmployee(
    @GetUser() user: User,
    @Body() updateEmployeeDto: UpdateEmpleadoDto,
  ) {
    return this.empleadosService.updateByUserId(user.id, updateEmployeeDto);
  }

  @Get('count')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Conteo total y desglose de empleados (activos, inactivos, total)' })
  @ApiResponse({ status: 200, description: 'Estadísticas numéricas de empleados.' })
  getCounts() {
    return this.empleadosService.getCounts();
  }

  @Get()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener la lista de todos los empleados (con soporte opcional de paginación)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'all'],
    description: 'Filtro por estado de actividad (default: all)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Búsqueda por nombre, email o cédula de identidad',
  })
  @ApiQuery({
    name: 'position',
    required: false,
    description: 'Filtro por cargo institucional',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados obtenida con éxito.',
    type: [Employee],
  })
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('position') position?: string,
  ) {
    if (search !== undefined || position !== undefined) {
      return this.empleadosService.findAll(status, page, limit, search, position);
    }
    return this.empleadosService.findAll(status, page, limit);
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

  @Get('Constancia-Empleado/:id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Descargar constancia de trabajo en formato PDF. Opcional: ?month=YYYY-MM para incluir actividades del mes.',
  })
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
  @ApiQuery({
    name: 'documentId',
    required: false,
    description:
      'UUID del registro DocumentVerification para reconstruir documento con su sello criptográfico inalterable',
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
    @Query('documentId') documentId?: string,
  ) {
    const pdfDoc = await this.empleadosService.ConstanciaEmpleadoByID(id, {
      month,
      employerName,
      employerPosition,
      employerCompany,
      documentId,
    });

    response.setHeader('Content-Type', 'application/pdf');
    const docTitle =
      pdfDoc.info?.Title && pdfDoc.info.Title !== 'employment-letter.pdf'
        ? pdfDoc.info.Title
        : month
          ? `Constancia de Trabajo Mensual (${month})`
          : 'Constancia de Trabajo';
    pdfDoc.info.Title = docTitle;
    const safeFilename = docTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-.() ]/g, '')
      .trim();
    const encodedFilename = encodeURIComponent(`${docTitle}.pdf`);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${safeFilename}.pdf"; filename*=UTF-8''${encodedFilename}`,
    );
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Patch(':id')
  @Auth(ValidRoles.admin)
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

  @Patch(':id/toggle-status')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alternar estado activo/inactivo de un empleado (desactivación o reactivación lógica)' })
  @ApiParam({
    name: 'id',
    description: 'UUID del empleado a alternar',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del empleado alternado correctamente.',
  })
  toggleStatus(@Param('id') id: string) {
    return this.empleadosService.toggleStatus(id);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar un empleado (eliminación lógica)' })
  @ApiParam({
    name: 'id',
    description: 'UUID del empleado a desactivar',
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado desactivado correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado.',
  })
  remove(@Param('id') id: string) {
    return this.empleadosService.remove(id);
  }
}
