import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check() {
    try {
      if (!this.connection.db) throw new Error('Database is not initialized');
      // readyState alone is not a dependency check in a serverless runtime.
      await this.connection.db.command({ ping: 1 }, { timeoutMS: 1500 });
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      // Keep provider errors and connection details out of the public response.
      throw new ServiceUnavailableException('API dependency is temporarily unavailable.');
    }
  }
}
