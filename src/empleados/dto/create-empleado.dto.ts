import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateEmpleadoDto {
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del empleado',
  })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    example: 'V20123456',
    description:
      'Cédula de identidad del empleado (se normalizará automáticamente a mayúsculas y con la V)',
  })
  @IsString()
  @MinLength(1)
  cedula!: string;

  @ApiProperty({
    example: '04141234567',
    description:
      'Número de teléfono móvil. Debe incluir un prefijo válido (0414, 0424, 0412, 0422, 0416, 0426) y tener 11 dígitos.',
  })
  @IsString({ message: 'El teléfono debe ser texto' })
  @Transform(({ value }) => value.replace(/\D/g, '')) // limpia antes de validar
  @Matches(/^(0414|0424|0412|0422|0416|0426)\d{7}$/, {
    message:
      'Formato de teléfono inválido. Debe ser uno de los prefijos (0414,0424,0412,0422,0416,0426) seguido de 7 dígitos.',
  })
  telefono!: string;

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
