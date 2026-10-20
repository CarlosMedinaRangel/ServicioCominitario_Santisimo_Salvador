import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyDocumentDto {
  @ApiProperty({
    description: 'Código escaneado del QR (ej. SS-DOC:v1:...)',
    example: 'SS-DOC:v1:YWJjZGVm...etc',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
