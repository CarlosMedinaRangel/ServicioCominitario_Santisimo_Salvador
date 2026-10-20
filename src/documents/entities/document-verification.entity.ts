import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum DocumentType {
  CONSTANCIA_TRABAJO = 'CONSTANCIA_TRABAJO',
  RECIBO_PAGO = 'RECIBO_PAGO',
  CONSTANCIA_ESTUDIO = 'CONSTANCIA_ESTUDIO',
  NOTAS_CERTIFICADAS = 'NOTAS_CERTIFICADAS',
  SOLVENCIA_ADMINISTRATIVA = 'SOLVENCIA_ADMINISTRATIVA',
  OTRO = 'OTRO',
}

export enum RecipientType {
  EMPLOYEE = 'EMPLOYEE',
  STUDENT = 'STUDENT',
  REPRESENTATIVE = 'REPRESENTATIVE',
}

export enum DocumentStatus {
  VALID = 'VALID',
  REVOKED = 'REVOKED',
}

@Entity('document_verifications')
export class DocumentVerification {
  @ApiProperty({ example: '8f2a1b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.CONSTANCIA_TRABAJO })
  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.CONSTANCIA_TRABAJO,
  })
  documentType: DocumentType;

  @ApiProperty({ enum: RecipientType, example: RecipientType.EMPLOYEE })
  @Column({
    type: 'enum',
    enum: RecipientType,
    default: RecipientType.EMPLOYEE,
  })
  recipientType: RecipientType;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ type: 'varchar', length: 255 })
  @Index()
  recipientId: string;

  @ApiProperty({ example: 'V-18234567' })
  @Column({ type: 'varchar', length: 50 })
  @Index()
  recipientIdentifier: string;

  @ApiProperty({ example: 'Prof. Carlos Medina' })
  @Column({ type: 'varchar', length: 255 })
  recipientName: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  issuedByUserId?: string;

  @ApiProperty({ example: 'Director General', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  issuedByName?: string;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.VALID })
  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.VALID,
  })
  status: DocumentStatus;

  @ApiProperty({ example: { cargo: 'Docente de Aula', jornada: 'Completa' }, required: false })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ example: 'SS-DOC:v1:...' })
  @Column({ type: 'text', unique: true })
  verificationCode: string;

  @ApiProperty()
  @CreateDateColumn()
  issuedAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
