import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ArrayMinSize,
} from 'class-validator';

const DIAS_VALIDOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export class CreateScheduleDto {
  @ApiProperty({ example: 'Biología Molecular III' })
  @IsString()
  nombre!: string;

  @ApiProperty({ example: 'Lab 402' })
  @IsString()
  aula!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato HH:MM requerido' })
  horaInicio!: string;

  @ApiProperty({ example: '11:30' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato HH:MM requerido' })
  horaFin!: string;

  @ApiProperty({ example: ['Lunes', 'Miércoles'], description: 'Uno o más días de la semana' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un día' })
  @IsIn(DIAS_VALIDOS, { each: true, message: 'Día no válido' })
  dias!: string[];

  @ApiProperty({ example: 'flask' })
  @IsString()
  icono!: string;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}