import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.user';
import { IErrorsTypeORM } from 'src/interfaces/error.response';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/auth.entity';

import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/Login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload';
import { JwtService } from '@nestjs/jwt';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { TurnstileService } from './services/turnstile.service';
import { UpdateUserDto } from './dto/update-auth.dto';
import { CryptoService } from 'src/crypto/crypto.service';
import { ValidRoles } from './interfaces/valid-roles';
import {
  ActivityService,
  LogActivityInput,
} from 'src/empleados/activity-service/activity-service.service';
export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  cedula?: string;
  telefono?: string;
  imagen?: string | null;
  isActive: boolean;
  roles: string[];
}

export function toSafeUser(user: Partial<User>): SafeUser {
  return {
    id: user.id!,
    email: user.email!,
    fullName: user.fullName!,
    cedula: user.cedula,
    telefono: user.telefono,
    imagen: user.imagen ?? null,
    isActive: user.isActive ?? true,
    roles: user.roles ?? [],
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly turnstileService: TurnstileService,
    private readonly cryptoService: CryptoService,
    private readonly activityService: ActivityService,
  ) {}

  async create(secureUrl, publicId, CreateUserDto: CreateUserDto) {
    try {
      const { password, ...UserData } = CreateUserDto;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = this.userRepository.create({
        ...UserData,
        imagen: secureUrl ?? CreateUserDto.imagen,
        publicId: publicId ?? CreateUserDto.publicId,
        password: hashedPassword,
      });

      await this.userRepository.save(user);
      return toSafeUser(user);
    } catch (error: any) {
      this.handleDBErrors(error);
    }
  }

  async login(loginUserDto: LoginUserDto, clientIp?: string) {
    const { email, password, turnstileToken } = loginUserDto;

    // 1. Anti-Bot Verification (Cloudflare Turnstile)
    await this.turnstileService.verifyToken(turnstileToken, clientIp);

    // 2. Query User
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        email: true,
        password: true,
        id: true,
        fullName: true,
        isActive: true,
        roles: true,
        cedula: true,
        telefono: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastFailedAttemptAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const now = Date.now();

    // 3. Account Lockout Check
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((new Date(user.lockedUntil).getTime() - now) / 60000),
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.LOCKED,
          error: 'Locked',
          message: `Cuenta bloqueada temporalmente por seguridad. Intente nuevamente en ${remainingMinutes} minuto(s).`,
        },
        HttpStatus.LOCKED,
      );
    }

    // 3.1 Sliding Window Expiry (1 hour TTL on failed attempts)
    // If the account is not actively locked and more than 1 hour passed since the last failure, reset counter
    const ONE_HOUR_MS = 60 * 60 * 1000;
    if (
      user.failedLoginAttempts > 0 &&
      user.lastFailedAttemptAt &&
      now - new Date(user.lastFailedAttemptAt).getTime() > ONE_HOUR_MS
    ) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.lastFailedAttemptAt = null;
    }

    // 4. Password Verification
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      user.lastFailedAttemptAt = new Date();
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        await this.userRepository.save(user);
        throw new HttpException(
          {
            statusCode: HttpStatus.LOCKED,
            error: 'Locked',
            message:
              'Cuenta bloqueada por 15 minutos debido a 5 intentos fallidos consecutivos.',
          },
          HttpStatus.LOCKED,
        );
      }

      await this.userRepository.save(user);
      const remaining = 5 - user.failedLoginAttempts;
      throw new UnauthorizedException(
        `Credenciales inválidas. Le quedan ${remaining} intento(s) antes del bloqueo temporal de la cuenta.`,
      );
    }

    // 5. Successful Login: Reset all failure counters and timestamps
    if (
      user.failedLoginAttempts > 0 ||
      user.lockedUntil ||
      user.lastFailedAttemptAt
    ) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.lastFailedAttemptAt = null;
      await this.userRepository.save(user);
    }

    return {
      ...toSafeUser(user),
      token: this.getJWTToken({ id: user.id }),
    };
  }

  async getMyEmployeeProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        employee: {
          schedules: true,
          groups: true,
          activities: true,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    let digitalIdToken: string | null = null;
    if (user.employee) {
      digitalIdToken = this.cryptoService.encryptPayload(
        {
          employeeId: user.employee.userId,
          userId: user.id,
          cedula: user.cedula || '',
          fullName: user.fullName,
          cargo: user.employee.position,
          issuedAt: new Date().toISOString(),
        },
        'EDID',
      );
    }

    return {
      user: toSafeUser(user),
      employee: user.employee || null,
      digitalIdToken,
    };
  }

  private getJWTToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  private handleDBErrors(error: IErrorsTypeORM): never {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    console.log(error);
    throw new InternalServerErrorException('Check the server logs');
  }

  checkAuthStatus(user: User): SafeUser {
    return toSafeUser(user);
  }

  async update(
    userId: string,
    secureUrl: string | undefined,
    publicId: string | undefined,
    updateUserDto: UpdateUserDto,
    requestingUser?: User, // ← usuario autenticado
  ) {
    const isAdmin = requestingUser?.roles?.includes(ValidRoles.admin) ?? false;

    const { currentPassword, newPassword, removePhoto, ...profileData } =
      updateUserDto;

    const userActual = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        publicId: true,
        fullName: true,
        email: true,
      },
    });

    if (!userActual) throw new UnauthorizedException('Usuario no encontrado');

    const activities: LogActivityInput[] = [];

    if (profileData.fullName && profileData.fullName !== userActual.fullName) {
      activities.push({
        tipo: 'Actualización de Perfil',
        descripcion: 'Nombre actualizado',
        detalle: `Nombre cambiado a "${profileData.fullName}"`,
      });
    }

    if (profileData.email && profileData.email !== userActual.email) {
      activities.push({
        tipo: 'Actualización de Perfil',
        descripcion: 'Correo actualizado',
        detalle: `Correo cambiado a "${profileData.email}"`,
      });
    }

    if (newPassword) {
      activities.push({
        tipo: 'Cambio de Contraseña',
        descripcion: 'Contraseña actualizada',
        detalle: isAdmin
          ? 'Contraseña restablecida por un administrador'
          : 'El empleado cambió su contraseña',
        destacada: true,
      });
    }

    if (secureUrl) {
      activities.push({
        tipo: 'Actualización de Perfil',
        descripcion: 'Foto de perfil actualizada',
        detalle: 'Nueva foto de perfil subida',
      });
    }

    if (removePhoto) {
      activities.push({
        tipo: 'Actualización de Perfil',
        descripcion: 'Foto de perfil eliminada',
        detalle: 'Foto de perfil removida',
      });
    }

    // ── Contraseña ────────────────────────────────────────────────────────
    if (newPassword) {
      if (isAdmin) {
        // Admin verificado por roles reales: resetea sin pedir la actual
      } else if (!currentPassword) {
        throw new BadRequestException(
          'Debes proporcionar la contraseña actual para poder cambiarla',
        );
      } else if (!bcrypt.compareSync(currentPassword, userActual.password)) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }
    }

    // ── Foto ──────────────────────────────────────────────────────────────
    let imagenUpdate:
      { imagen: string | null; publicId: string | null } | undefined;

    if (secureUrl) {
      if (userActual.publicId)
        await this.cloudinaryService.deleteFile(userActual.publicId);
      imagenUpdate = { imagen: secureUrl, publicId: publicId! };
    } else if (removePhoto && userActual.publicId) {
      await this.cloudinaryService.deleteFile(userActual.publicId);
      imagenUpdate = { imagen: null, publicId: null };
    }

    const hashedPassword = newPassword ? await bcrypt.hash(newPassword, 10) : undefined;
    const user = await this.userRepository.preload({
      id: userId,
      ...profileData,
      ...imagenUpdate,
      ...(hashedPassword ? { password: hashedPassword } : {}),
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    try {
      const result = await this.userRepository.save(user);
      await this.activityService.logMany(userId, activities);
      return toSafeUser(result);
    } catch (error: any) {
      this.handleDBErrors(error);
    }
  }
}
