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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async create(CreateUserDto: CreateUserDto) {
    try {
      const { password, ...UserData } = CreateUserDto;
      const user = this.userRepository.create({
        ...UserData,
        password: bcrypt.hashSync(password, 10),
      });

      await this.userRepository.save(user);
      const { password: pass, ...userinfo } = user;

      return {
        ...userinfo,
        token: this.getJWTToken({ id: user.id }),
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
}
