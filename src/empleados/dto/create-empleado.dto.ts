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
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  cedula!: string;

  @IsString({ message: 'El teléfono debe ser texto' })
  @Transform(({ value }) => value.replace(/\D/g, '')) // limpia antes de validar
  @Matches(/^(0414|0424|0412|0422|0416|0426)\d{7}$/, {
    message:
      'Formato de teléfono inválido. Debe ser uno de los prefijos (0414,0424,0412,0422,0416,0426) seguido de 7 dígitos.',
  })
  telefono!: string;

  @IsString()
  @MinLength(1)
  position!: string;

  @IsDate()
  @Type(() => Date)
  start_date!: string;

  @IsString()
  @MinLength(1)
  work_time!: string;

  @IsNumber()
  @IsPositive()
  hours_per_day!: number;

  @IsString()
  @MinLength(1)
  work_schedule!: string;
}
