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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly turnstileService: TurnstileService,
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
      const { password: _, ...userInfo } = user;
      return userInfo;
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Account Lockout Check
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000),
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

    // 4. Password Verification
    if (!bcrypt.compareSync(password, user.password)) {
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

    // 5. Successful Login: Reset failure counters
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await this.userRepository.save(user);
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
  ) {
    const userActual = await this.userRepository.findOneBy({ id: userId });

    if (!userActual) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Borra imagen anterior si viene una nueva
    if (secureUrl && userActual.publicId) {
      await this.cloudinaryService.deleteFile(userActual.publicId);
    }

    const user = await this.userRepository.preload({
      id: userId,
      ...updateUserDto,
      ...(secureUrl ? { imagen: secureUrl, publicId } : {}),
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    try {
      const result = await this.userRepository.save(user);
      const { password, ...userInfo } = result;
      return userInfo;
    } catch (error: any) {
      this.handleDBErrors(error);
    }
  }
}
