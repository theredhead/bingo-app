import { Module, Provider } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';

export const CONFIG_SERVICE = 'ConfigService';

export const PublicConfigProvider: Provider = {
  provide: 'PUBLIC_CONFIG',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    keycloakRealm: configService.get<string>('KEYCLOAK_REALM'),
    keycloakAuthServerUrl: configService.get<string>('KEYCLOAK_AUTH_SERVER_URL'),
    keycloakFrontendClientId: configService.get<string>('KEYCLOAK_FRONTEND_CLIENT_ID'),
  }),
};

@Module({
  imports: [NestConfigModule],
  providers: [PublicConfigProvider],
  exports: [NestConfigModule, PublicConfigProvider],
})
export class ConfigModule {}
