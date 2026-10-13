import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.user';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiPropertyOptional({
    example: 'MiPasswordActual1!',
    description:
      'Contraseña actual. Requerida solo si deseas cambiar la contraseña.',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({
    example: 'NuevaPassword2!',
    description:
      'Nueva contraseña. Si se envía, currentPassword es obligatorio.',
    minLength: 6,
    maxLength: 50,
  })
  @ValidateIf((o) => !!o.newPassword)
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'La contraseña debe tener mayúscula, minúscula y un número o carácter especial',
  })
  newPassword?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Enviar true para eliminar la foto de perfil actual sin reemplazarla.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true) // multipart viene como string
  removePhoto?: boolean;
}
