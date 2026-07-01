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

      //TODO: JWT
    } catch (error: any) {
      this.handleDBErrors(error);
    }
  }

  async login(LoginUserDto: LoginUserDto) {
    const { email, password } = LoginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true },
    });

    if (!user) {
      throw new UnauthorizedException(`Credential are not valid(email)`);
    }

    if (!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException(`Credential are not valid(Password)`);
    }
    return {
      ...user,
      token: this.getJWTToken({ id: user.id }),
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
