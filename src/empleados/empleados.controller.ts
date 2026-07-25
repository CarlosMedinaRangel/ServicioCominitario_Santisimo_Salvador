import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import type { Response } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Empleado } from './entities/empleado.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { imageFileFilter } from 'src/cloudinary/helpers/fileFilter';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@ApiTags(`empleados`)
@Controller('empleados')
export class EmpleadosController {
  constructor(
    private readonly empleadosService: EmpleadosService,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, //mb
    }),
  )
  @ApiOperation({ summary: 'Registrar un nuevo empleado' })
  @ApiResponse({
    status: 201,
    description: 'Empleado creado exitosamente',
    type: Empleado,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validaciones de DTO fallidas.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado, Token inválido o ausente.',
  })
  async create(
    @Body() createEmpleadoDto: CreateEmpleadoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      return;
    }
    const { secureUrl, publicId } = await this.cloudinaryService.uploadFile(
      file,
      'empleados',
    );
    return this.empleadosService.create(secureUrl, publicId, createEmpleadoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener la lista de todos los empleados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados obtenida con éxito.',
    type: [Empleado], // Se usa [Empleado] para indicar que es un Array
  })
  findAll() {
    return this.empleadosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener la información de un empleado específico' })
  @ApiParam({
    name: 'id',
    description: 'ID o Cédula del empleado',
    example: '2',
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado encontrado con éxito.',
    type: Empleado,
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado.',
  })
  findOne(@Param('id') id: string) {
    return this.empleadosService.findOne(id);
  }

  @Get('Constancia-Empleado/:id')
  @ApiOperation({ summary: 'Descargar constancia de trabajo en formato PDF' })
  @ApiParam({
    name: 'id',
    description: 'ID del empleado para generar su constancia',
    example: '2',
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
  ) {
    const pdfDoc = await this.empleadosService.ConstanciaEmpleadoByID(id);

    // Configura las cabeceras correctamente
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'employment-letter.pdf'; // Corregido typo 'employement'
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, //mb
    }),
  )
  @ApiOperation({ summary: 'Actualizar los datos de un empleado' })
  @ApiParam({
    name: 'id',
    description: 'ID del empleado a actualizar',
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado actualizado correctamente.',
    type: Empleado,
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      return;
    }
    const { secureUrl, publicId } = await this.cloudinaryService.uploadFile(
      file,
      'empleados',
    );
    return this.empleadosService.update(
      id,
      secureUrl,
      publicId,
      updateEmpleadoDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un empleado (Soft Delete o Eliminación física)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del empleado a eliminar',
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
