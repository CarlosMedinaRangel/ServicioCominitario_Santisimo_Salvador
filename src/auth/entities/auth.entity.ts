import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @BeforeInsert()
  checkFilesBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  checkFilesBeforeUpdate() {
    this.checkFilesBeforeInsert();
  }
}
