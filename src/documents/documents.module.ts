import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentVerification } from './entities/document-verification.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/auth.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentVerification, User]),
    AuthModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, TypeOrmModule],
})
export class DocumentsModule {}
