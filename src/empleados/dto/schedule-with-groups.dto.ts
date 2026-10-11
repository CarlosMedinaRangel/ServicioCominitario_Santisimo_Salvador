import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScheduleDto } from './create-schedule.dto';
import { CreateGroupDto } from './create-group.dto';

export class ScheduleWithGroupsDto extends CreateScheduleDto {
  @ApiProperty({
    type: [CreateGroupDto],
    required: false,
    description: 'Grupos que asisten a esta clase',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGroupDto)
  groups?: CreateGroupDto[];
}
