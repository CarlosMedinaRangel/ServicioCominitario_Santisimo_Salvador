import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    example: 'correo@ejemplo.com',
    description: 'Correo electrónico registrado del usuario',
  })
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'SuperSecreto123!',
    description:
      'Contraseña del usuario. Debe contener al menos una mayúscula, una minúscula y un número o carácter especial.',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'The password must have a Uppercase, lowercase letter and a number',
  })
  password!: string;

  @ApiPropertyOptional({
    example: 'XXXX.DUMMY.TOKEN.XXXX',
    description:
      'Token anti-bot de Cloudflare Turnstile. En desarrollo / Swagger docs (/docs), puedes enviar "XXXX.DUMMY.TOKEN.XXXX" para pruebas sin widget.',
  })
  @IsString()
  @IsOptional()
  turnstileToken?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Si es true, la cookie persiste por 30 días. Si es false, es una cookie de sesión eliminada al cerrar el navegador.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
