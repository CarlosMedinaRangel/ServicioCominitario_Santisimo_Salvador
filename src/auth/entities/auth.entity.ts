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
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { unique: true })
  email!: string;

  @Column('text', { select: false })
  password!: string;

  @Column('text')
  fullName!: string;

  @Column('boolean', { default: true })
  isActive!: boolean;

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
