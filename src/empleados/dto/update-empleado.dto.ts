import { OmitType, PartialType, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEmpleadoDto } from './create-empleado.dto';
import { UpdateScheduleWithGroupsDto } from './update-schedule-with-groups.dto';

export class UpdateEmpleadoDto extends OmitType(
  PartialType(CreateEmpleadoDto),
  ['schedules'] as const, // ← excluye schedules del padre
) {
  @ApiProperty({ type: [UpdateScheduleWithGroupsDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateScheduleWithGroupsDto)
  schedules?: UpdateScheduleWithGroupsDto[]; // ← redeclara con el tipo correcto
}
