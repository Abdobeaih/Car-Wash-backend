import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check() {
    const dbState = this.connection.readyState;
    return {
      status: 'ok',
      database: dbState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
