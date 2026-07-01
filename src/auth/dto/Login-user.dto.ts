import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
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
}
