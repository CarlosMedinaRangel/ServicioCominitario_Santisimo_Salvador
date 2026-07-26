import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../empleados/entities/employee.entity';

@Entity('users')
export class User {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único generado automáticamente (UUID)',
    uniqueItems: true,
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Correo electrónico único del usuario',
    uniqueItems: true,
  })
  @Column('text', { unique: true })
  email!: string;

  @ApiProperty({
    example: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    description:
      'Contraseña encriptada del usuario (No se devuelve en consultas habituales)',
  })
  @Column('text', { select: false })
  password!: string;

  @ApiProperty({
    example: 'Carlos Rodríguez',
    description: 'Nombre completo del usuario',
  })
  @Column('text')
  fullName!: string;

  @ApiPropertyOptional({
    example: 'V12345678',
    description:
      'Cédula de identidad (única, común a todos los tipos de usuario)',
  })
  @Column('text', { unique: true, nullable: true })
  cedula?: string;

  @ApiPropertyOptional({
    example: '04121234567',
    description: 'Número de teléfono',
  })
  @Column('text', { nullable: true })
  telefono?: string;

  @Column('text', { unique: true, nullable: true })
  imagen?: string;

  @Column({ nullable: true })
  publicId?: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el usuario está activo en el sistema',
    default: true,
  })
  @Column('boolean', { default: true })
  isActive!: boolean;

  @ApiProperty({
    example: ['user', 'admin'],
    description: 'Lista de roles asignados al usuario para control de acceso',
    type: [String],
    default: ['user'],
  })
  @Column('text', { array: true, default: ['user'] })
  roles!: string[];

  @OneToOne(() => Employee, (employee) => employee.user)
  employee?: Employee;

  @BeforeInsert()
  checkFilesBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
    if (this.cedula) {
      this.cedula = this.cedula.replace(/\./g, '').toUpperCase();
      if (!this.cedula.startsWith('V')) this.cedula = 'V' + this.cedula;
    }
  }

  @BeforeUpdate()
  checkFilesBeforeUpdate() {
    this.checkFilesBeforeInsert();
  }
}
