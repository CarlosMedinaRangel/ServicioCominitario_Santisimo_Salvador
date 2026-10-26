import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/auth.entity';
import * as bcrypt from 'bcrypt';
import {
  CANONICAL_ADMIN_USER,
  CANONICAL_ELENA_USER,
  CANONICAL_CARLOS_USER,
  CANONICAL_ANA_USER,
  CANONICAL_INACTIVE_USER,
} from '../data/users.canonical';

export interface SeededUsers {
  admin: User;
  elena: User;
  carlos: User;
  ana: User;
  inactive: User;
  bulk: User[];
}

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) { }

  async run(): Promise<SeededUsers> {
    const adminPassword =
      this.configService.get<string>('SEED_ADMIN_PASSWORD') || 'Admin123!';
    const elenaPassword =
      this.configService.get<string>('SEED_ELENA_PASSWORD') || 'Elena123!';
    const carlosPassword =
      this.configService.get<string>('SEED_CARLOS_PASSWORD') || 'Carlos123!';
    const anaPassword =
      this.configService.get<string>('SEED_ANA_PASSWORD') || 'Ana123!';
    const inactivePassword =
      this.configService.get<string>('SEED_INACTIVE_PASSWORD') || 'Inactivo123!';

    // 1. Admin Principal Canónico
    const admin = this.userRepository.create({
      ...CANONICAL_ADMIN_USER,
      email:
        this.configService.get<string>('SEED_ADMIN_EMAIL') ||
        CANONICAL_ADMIN_USER.email,
      fullName:
        this.configService.get<string>('SEED_ADMIN_NAME') ||
        CANONICAL_ADMIN_USER.fullName,
      password: await bcrypt.hash(adminPassword, 10),
    });
    await this.userRepository.save(admin);

    // 2. Dr. Elena Rodríguez (Docente Titular Canónica)
    const elena = this.userRepository.create({
      ...CANONICAL_ELENA_USER,
      cedula:
        this.configService.get<string>('SEED_EMPLOYEE_CEDULA') ||
        CANONICAL_ELENA_USER.cedula,
      password: await bcrypt.hash(elenaPassword, 10),
    });
    await this.userRepository.save(elena);

    // 3. Ing. Carlos Pérez (Profesor de Matemáticas Canónico)
    const carlosImagen =
      this.configService.get<string>('SEED_CARLOS_IMAGEN') || null;
    const carlosPublicId = carlosImagen
      ? carlosImagen
        .split('/upload/')[1]
        ?.replace(/^v\d+\//, '')
        .replace(/\.[^/.]+$/, '') || null
      : null;

    const carlos = this.userRepository.create({
      ...CANONICAL_CARLOS_USER,
      imagen: carlosImagen,
      publicId: carlosPublicId,
      password: await bcrypt.hash(carlosPassword, 10),
    });
    await this.userRepository.save(carlos);

    // 4. Lic. Ana Torres (Coordinadora Académica Canónica)
    const ana = this.userRepository.create({
      ...CANONICAL_ANA_USER,
      password: await bcrypt.hash(anaPassword, 10),
    });
    await this.userRepository.save(ana);

    // 5. Prof. Inactivo Retirado (Docente Soft-Deleted Canónico)
    const inactive = this.userRepository.create({
      ...CANONICAL_INACTIVE_USER,
      password: await bcrypt.hash(inactivePassword, 10),
    });
    await this.userRepository.save(inactive);

    // 6. Bulk Employees (Employee 1..15)
    const bulk: User[] = [];
    for (let i = 1; i <= 15; i++) {
      const bulkUser = this.userRepository.create({
        email: `employee${i}@santisimo.edu`,
        password: await bcrypt.hash(`Employee${i}123!`, 10),
        fullName: `Employee ${i}`,
        cedula: `V${1000000 + i}`,
        telefono: `0414${String(5500000 + i).padStart(7, '0')}`,
        roles: ['user'],
        isActive: true,
      });
      await this.userRepository.save(bulkUser);
      bulk.push(bulkUser);
    }

    return { admin, elena, carlos, ana, inactive, bulk };
  }
}
