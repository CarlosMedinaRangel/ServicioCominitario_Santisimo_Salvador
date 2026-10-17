import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleWithGroupsDto } from './schedule-with-groups.dto';

export class CreateEmpleadoDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'Docente de Biología' })
  @IsString()
  position!: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsString()
  start_date!: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  work_time!: string;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  hours_per_day!: number;

  @ApiProperty({ example: 'Lunes a Viernes, 8am - 4pm' })
  @IsString()
  work_schedule!: string;

  // Cada schedule lleva sus propios grupos adentro
  @ApiProperty({ type: [ScheduleWithGroupsDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleWithGroupsDto)
  schedules?: ScheduleWithGroupsDto[];
}
