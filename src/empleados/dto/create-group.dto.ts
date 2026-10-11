import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';



export class CreateGroupDto {
  @ApiProperty({ example: 'Grupo A-1' })
  @IsString()
  nombre!: string;

  @ApiProperty({ example: 24 })
  @IsInt()
  @Min(1)
  cantidadEstudiantes!: number;
}