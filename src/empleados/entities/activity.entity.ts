import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('activities')
export class Activity {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'UUID del empleado' })
  @Column('uuid')
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.activities)
  @JoinColumn({ name: 'employeeId' })
  employee!: Employee;

  @ApiProperty({ example: 'Publicación de Calificaciones', description: 'Tipo de actividad' })
  @Column('varchar', { length: 200 })
  tipo!: string;

  @ApiProperty({ example: 'Biología Molecular III', description: 'Descripción breve' })
  @Column('varchar', { length: 200 })
  descripcion!: string;

  @ApiProperty({ example: 'Hoy, 10:45 AM', description: 'Detalle adicional' })
  @Column('varchar', { length: 200 })
  detalle!: string;

  @ApiProperty({ example: '2024-11-05T10:45:00.000Z', description: 'Timestamp de la actividad' })
  @Column('timestamp')
  timestamp!: Date;

  @ApiProperty({ example: true, description: 'Indica si la actividad es destacada', default: false })
  @Column('boolean', { default: false })
  destacada!: boolean;
}
