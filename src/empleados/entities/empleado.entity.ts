import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'Empleados' })
export class Empleado {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  cedula!: string;

  @Column({ type: 'varchar', length: 15 })
  telefono!: string;

  @Column({ type: 'varchar', length: 50 })
  position!: string;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'time' })
  work_time!: string;

  @Column({ type: 'int' })
  hours_per_day!: number;

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
