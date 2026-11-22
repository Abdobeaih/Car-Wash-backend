import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { HealthController } from '../src/health/health.controller';

describe('HealthController dependency check', () => {
  it('pings the database instead of trusting readyState alone', async () => {
    const command = jest.fn().mockResolvedValue({ ok: 1 });
    const controller = new HealthController({
      readyState: 0,
      db: { command },
    } as unknown as Connection);
    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
    });
    expect(command).toHaveBeenCalledWith({ ping: 1 }, { timeoutMS: 1500 });
  });
  it('returns an unavailable error when no database has initialized', async () => {
    const controller = new HealthController({ db: undefined } as unknown as Connection);
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('does not leak driver errors in the public failure', async () => {
    const command = jest.fn().mockRejectedValue(new Error('Private provider diagnostic'));
    const controller = new HealthController({
      readyState: 1,
      db: { command },
    } as unknown as Connection);
    try {
      await controller.check();
      throw new Error('Expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as Error).message).not.toContain('Private provider diagnostic');
    }
  });
});
