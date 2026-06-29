import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
} from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import type { Response } from 'express';

@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Post()
  create(@Body() createEmpleadoDto: CreateEmpleadoDto) {
    return this.empleadosService.create(createEmpleadoDto);
  }

  @Get()
  findAll() {
    return this.empleadosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empleadosService.findOne(id);
  }

    @Get('Constancia-Empleado/:id')
    async ConstanciaEmpleadoByID(
      @Res() response: Response,
      @Param('id') id: string,
    ) {
      const pdfDoc = await this.empleadosService.ConstanciaEmpleadoByID(id);
  
      // Configura las cabeceras correctamente
      response.setHeader('Content-Type', 'application/pdf');
      pdfDoc.info.Title = 'employement-letter.pdf';
      pdfDoc.pipe(response);
      pdfDoc.end();
    }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
  ) {
    return this.empleadosService.update(id, updateEmpleadoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.empleadosService.remove(id);
  }
}
