import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev-secret-change-in-production',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [RegistryController],
  providers: [RegistryService, EncryptionService],
  exports: [RegistryService],
})
export class RegistryModule {}
