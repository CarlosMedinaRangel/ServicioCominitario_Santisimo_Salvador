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
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
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

import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
      const uploaded = await this.cloudinaryService.uploadFile(
        file,
        'usuarios',
      );
      secureUrl = uploaded.secureUrl;
      publicId = uploaded.publicId;
    }
    const result = await this.authService.create(
      secureUrl,
      publicId,
      createUserDto,
    );
    return result;
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Iniciar sesión y obtener token de acceso' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Devuelve los datos del usuario (sin token en body).',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Credenciales incorrectas.',
  })
  @ApiResponse({
    status: 423,
    description: 'Locked. Cuenta temporalmente bloqueada por 5 intentos fallidos.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests. Límite de intentos por IP excedido.',
  })
  async LoginUser(
    @Body() LoginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
    @Req() req: any,
  ) {
    const clientIp = req.ip || req.connection?.remoteAddress;
    const result = await this.authService.login(LoginUserDto, clientIp);
    if (result && result.token) {
      const cookieConfig = {
        httpOnly: true,
        sameSite: isProduction ? ('none' as const) : ('strict' as const),
        secure: isProduction,
        path: '/',
        ...(LoginUserDto.rememberMe
          ? { maxAge: 1000 * 60 * 60 * 24 * 15 } // 15 days
          : {}), // Session cookie: destroyed when user closes browser
      };
      response.cookie(COOKIE_NAME, result.token, cookieConfig);
      // Return user data WITHOUT token (httpOnly cookie is the source of truth)
      const { token: _, ...safeResult } = result;
      return safeResult;
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

  @Patch('update-profile/:id')
  @Auth(ValidRoles.admin)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: actualizar perfil de cualquier usuario por ID',
  })
  async updateProfileById(
    @GetUser() requestingUser: User, // ← quien hace la petición
    @Param('id') userId: string,
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

    return this.authService.update(
      userId,
      secureUrl,
      publicId,
      updateUserDto,
      requestingUser,
    );
  }

  @Patch('update-profile')
  @Auth() // cualquier usuario autenticado, sin rol
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar mi propio perfil' })
  async updateMyProfile(
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

    return this.authService.update(
      user.id,
      secureUrl,
      publicId,
      updateUserDto,
      user,
    );
  }
}
