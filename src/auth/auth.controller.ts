import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  SetMetadata,
  UseInterceptors,
  UploadedFile,
  Patch,
} from '@nestjs/common';
import { Response } from 'express';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { imageFileFilter } from 'src/cloudinary/helpers/fileFilter';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UpdateUserDto } from './dto/update-auth.dto';

// ════════════════════════════════════════════════════════════════════════════════
// 💡 COOKIE CONFIGURATION & DEPLOYMENT NOTES:
// - Development: sameSite: 'strict', secure: false (works on http://localhost)
// - Production (Same Domain / Subdomains like app.school.com & api.school.com):
//   sameSite: 'lax', secure: true (HTTPS provided free by Render/Railway/Vercel)
// - Production (Different Domains like app.vercel.app & api.render.com):
//   sameSite: 'none', secure: true (Requires HTTPS + cors origin matching)
// ════════════════════════════════════════════════════════════════════════════════
const isProduction = process.env.NODE_ENV === 'production';

// ── __Host- prefix requires HTTPS (secure: true) and Path=/ ──
// In production (HTTPS), prefix with __Host- for maximum browser enforcement.
// In local dev (HTTP), fallback to auth_token without prefix.
export const COOKIE_NAME = isProduction ? '__Host-auth_token' : 'auth_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProduction ? ('none' as const) : ('strict' as const),
  secure: isProduction, // Free HTTPS certificates on Render/Railway/Vercel
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  path: '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, //mb
    }),
  )
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
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let secureUrl: string | undefined;
    let publicId: string | undefined;
    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(file, 'usuarios');
      secureUrl = uploaded.secureUrl;
      publicId = uploaded.publicId;
    }
    const result = await this.authService.create(secureUrl, publicId, createUserDto);
    if (result && result.token) {
      response.cookie(COOKIE_NAME, result.token, COOKIE_OPTIONS);
    }
    return result;
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
  async LoginUser(
    @Body() LoginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(LoginUserDto);
    if (result && result.token) {
      response.cookie(COOKIE_NAME, result.token, COOKIE_OPTIONS);
    }
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión y limpiar cookie httpOnly' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente.',
  })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true, message: 'Sesión cerrada exitosamente' };
  }

  @Get('me/employee')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil de empleado del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil de empleado obtenido exitosamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Token ausente, inválido o expirado.',
  })
  getMyEmployeeProfile(@GetUser() user: User) {
    return this.authService.getMyEmployeeProfile(user.id);
  }

  @Get('check-status')
  @Auth()
  @ApiBearerAuth()
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

  @Patch('update-profile')
  @Auth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  async updateProfile(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let secureUrl: string | undefined;
    let publicId: string | undefined;

    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(
        file,
        'usuarios',
      );
      secureUrl = uploaded.secureUrl;
      publicId = uploaded.publicId;
    }

    return this.authService.update(user.id, secureUrl, publicId, updateUserDto);
  }

  @Get('private')
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'), UserRoleGuard)
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
