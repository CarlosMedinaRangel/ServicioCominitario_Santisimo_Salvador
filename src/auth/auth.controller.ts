import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  SetMetadata,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto.user';
import { LoginUserDto } from './dto/Login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from './entities/auth.entity';
import { GetUser } from './Decorators/get-user.decorator';
import { RawHeader } from './Decorators/get-rawHeader.decorator';
import { UserRoleGuard } from './guards/user-role/user-role.guard';
import { RoleProtected } from './Decorators/role-protected.decorator';
import { ValidRoles } from './interfaces';
import { Auth } from './Decorators/auth.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario en el sistema' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request. Error en las validaciones del DTO o el correo ya existe.',
  })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener token de acceso' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Devuelve los datos del usuario y el JWT.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Credenciales incorrectas.',
  })
  LoginUser(@Body() LoginUserDto: LoginUserDto) {
    return this.authService.login(LoginUserDto);
  }

  @Get('check-status')
  @Auth()
  @ApiBearerAuth() // Le dice a Swagger que este endpoint requiere Token
  @ApiOperation({
    summary: 'Verificar el estado de autenticación y renovar JWT',
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido. Devuelve el usuario y un nuevo JWT.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Token ausente, inválido o expirado.',
  })
  checkAuthStatus(@GetUser() user: User) {
    return this.authService.checkAuthStatus(user);
  }

  @Get('private')
  @UseGuards(AuthGuard())
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ruta privada de prueba 1 (Requiere cualquier token válido)',
  })
  @ApiResponse({ status: 200, description: 'Acceso permitido' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  testingPrivateRoute(
    @Req() request: Express.Request,
    @GetUser() user: User,
    @GetUser('email') UserEmail: string,
    @RawHeader() rawHeader: string[],
  ) {
    console.log({ request });
    return {
      ok: true,
      message: 'Hola Mundo Private',
      user,
      UserEmail,
      rawHeader,
    };
  }

  @Get('private2')
  @RoleProtected(ValidRoles.admin)
  @UseGuards(AuthGuard(), UserRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ruta privada de prueba 2 (Requiere rol de Admin)' })
  @ApiResponse({ status: 200, description: 'Acceso permitido' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Token faltante o inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. El usuario no tiene rol de administrador.',
  })
  privateRoute2(@GetUser() user: User) {
    return {
      ok: true,
      user,
    };
  }

  @Get('private3')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Ruta privada de prueba 3 (Usando Custom Decorator @Auth - Requiere Admin)',
  })
  @ApiResponse({ status: 200, description: 'Acceso permitido' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  privateRoute3(@GetUser() user: User) {
    return {
      ok: true,
      user,
    };
  }
}
