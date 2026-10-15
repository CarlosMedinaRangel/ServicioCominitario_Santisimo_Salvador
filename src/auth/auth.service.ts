import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
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
import { UpdateUserDto } from './dto/update-auth.dto';
import { ValidRoles } from './interfaces/valid-roles';
import {
  ActivityService,
  LogActivityInput,
} from 'src/empleados/activity-service/activity-service.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,

    private readonly cloudinaryService: CloudinaryService,
    private readonly activityService: ActivityService,
  ) {}

  async create(secureUrl, publicId, CreateUserDto: CreateUserDto) {
    try {
      const { password, ...UserData } = CreateUserDto;
      const user = this.userRepository.create({
        ...UserData,
        imagen: secureUrl ?? CreateUserDto.imagen,
        publicId: publicId ?? CreateUserDto.publicId,
        password: bcrypt.hashSync(password, 10),
      });

      await this.userRepository.save(user);
      const { password: pass, ...userinfo } = user;

      return {
        ...userinfo,
      };
    } catch (error: any) {
      this.handleDBErrors(error);
    }
  }

  async login(LoginUserDto: LoginUserDto) {
    const { email, password } = LoginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      relations: { employee: true },
      select: {
        email: true,
        password: true,
        id: true,
        fullName: true,
        isActive: true,
        roles: true,
        cedula: true,
        telefono: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(`Credenciales inválidas`);
    }

    if (!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException(`Credenciales inválidas`);
    }
    const { password: _, ...userInfo } = user;
    return {
      ...userInfo,
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

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        cedula: user.cedula,
        telefono: user.telefono,
        isActive: user.isActive,
        roles: user.roles,
        imagen: user.imagen,
      },
      employee: user.employee || null,
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

  checkAuthStatus(user: User) {
    return {
      ...user,
      token: this.getJWTToken({ id: user.id }),
    };
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

    const user = await this.userRepository.preload({
      id: userId,
      ...profileData,
      ...imagenUpdate,
      ...(newPassword ? { password: bcrypt.hashSync(newPassword, 10) } : {}),
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    try {
      const result = await this.userRepository.save(user);
      const { password, ...userInfo } = result;
      await this.activityService.logMany(userId, activities);
      return userInfo;
    } catch (error: any) {
      this.handleDBErrors(error);
    }
  }
}
