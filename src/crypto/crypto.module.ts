import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoService } from './crypto.service';
import { QrGeneratorService } from './qr-generator.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CryptoService, QrGeneratorService],
  exports: [CryptoService, QrGeneratorService],
})
export class CryptoModule {}
