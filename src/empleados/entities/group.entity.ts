import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('groups')
export class Group {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'UUID del empleado' })
  @Column('uuid')
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.groups)
  @JoinColumn({ name: 'employeeId' })
  employee!: Employee;

  @ApiProperty({ example: 'Grupo A-1', description: 'Nombre del grupo' })
  @Column('varchar', { length: 100 })
  nombre!: string;

  @ApiProperty({ example: 24, description: 'Cantidad de estudiantes' })
  @Column('int')
  cantidadEstudiantes!: number;
}
