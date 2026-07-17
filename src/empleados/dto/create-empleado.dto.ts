import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateEmpleadoDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID del usuario al que pertenece este empleado',
  })
  @IsString()
  @IsUUID()
  userId!: string;

  @ApiProperty({
    example: 'Desarrollador Backend',
    description: 'Cargo o posición que ocupará el empleado en la empresa',
  })
  @IsString()
  @MinLength(1)
  position!: string;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Fecha de inicio laboral del empleado (YYYY-MM-DD)',
    type: String,
    format: 'date',
  })
  @IsDate()
  @Type(() => Date)
  start_date!: string;

  @ApiProperty({
    example: '09:00',
    description: 'Hora de entrada del empleado',
  })
  @IsString()
  @MinLength(1)
  work_time!: string;

  @ApiProperty({
    example: 8,
    description: 'Cantidad de horas laborales que cumple el empleado al día',
  })
  @IsNumber()
  @IsPositive()
  hours_per_day!: number;

  @ApiProperty({
    example: 'Lunes a Viernes, 9am - 5pm',
    description: 'Horario laboral detallado del empleado',
  })
  @IsString()
  @MinLength(1)
  work_schedule!: string;
}
