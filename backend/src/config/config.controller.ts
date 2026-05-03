import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('api/config')
export class ConfigController {
  constructor(
    @Inject('PUBLIC_CONFIG') private readonly publicConfig: any,
  ) {}

  @Get()
  getPublicConfig() {
    return this.publicConfig;
  }
}
