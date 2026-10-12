import { OmitType, PartialType, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleWithGroupsDto } from './schedule-with-groups.dto';
import { UpdateGroupDto } from './update-group.dto';

export class UpdateScheduleWithGroupsDto extends OmitType(
  PartialType(ScheduleWithGroupsDto),
  ['groups'] as const,
) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ type: [UpdateGroupDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGroupDto)
  groups?: UpdateGroupDto[];
}
