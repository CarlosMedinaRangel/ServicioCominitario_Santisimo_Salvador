import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'Empleados' })
export class Empleado {
  @ApiProperty({
    example: '2',
    description: `Empleado ID`,
    uniqueItems: true,
  })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({
    example: 'Juan Pérez',
    description: `Nombre del empleado`,
  })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @ApiProperty({
    example: 'V20123456',
    description: `Cedula del empleado`,
    uniqueItems: true,
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  cedula!: string;

  @ApiProperty({
    example: '04141234567',
    description: `Nro de telefono del empleado`,
    uniqueItems: true,
  })
  @Column({ type: 'varchar', length: 15 })
  telefono!: string;

  @ApiProperty({
    example: 'Desarrollador',
    description: `Cargo del empleado`,
  })
  @Column({ type: 'varchar', length: 50 })
  position!: string;

  @ApiProperty({
    example: '2021-01-15',
    description: `Fecha de inicio laboral del empleado`,
  })
  @Column({ type: 'date' })
  start_date!: Date;

  @ApiProperty({
    example: '09:00',
    description: `Hora de entrada / inicio del turno del empleado`, 
  })
  @Column({ type: 'time' })
  work_time!: string;

  @ApiProperty({
    example: 8,
    description: `Cuantas horas laborales cumple el empleado al dia`,
  })
  @Column({ type: 'int' })
  hours_per_day!: number;

  @ApiProperty({
    example: '9am - 5pm',
    description: `Horario laboral del empleado`,
  })
  @Column({ type: 'varchar', length: 50 })
  work_schedule!: string;

  @BeforeInsert()
  @BeforeUpdate()
  cedulaverificacion() {
    if (this.cedula) {
      // 1. Eliminar todos los puntos
      let cedulaLimpia = this.cedula.replace(/\./g, '');

      // 2. Convertir a mayúsculas (por si mandan 'v' minúscula)
      cedulaLimpia = cedulaLimpia.toUpperCase();

      // 3. Si no empieza con 'V', agregarla
      if (!cedulaLimpia.startsWith('V')) {
        cedulaLimpia = 'V' + cedulaLimpia;
      }

      // Asignar el valor normalizado
      this.cedula = cedulaLimpia;
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizarTelefono() {
    if (this.telefono) {
      // Elimina todo lo que no sea dígito
      this.telefono = this.telefono.replace(/\D/g, '');
    }
  }
}
