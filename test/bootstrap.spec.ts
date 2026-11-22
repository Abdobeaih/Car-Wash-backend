import { Body, Controller, Get, INestApplication, Module, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { LoginDto } from '../src/auth/dto/login.dto';

@Controller('probe')
class ProbeController {
  @Get()
  read() {
    return { ok: true };
  }
  @Post()
  validate(@Body() dto: LoginDto) {
    return { email: dto.email };
  }
}
@Module({
  controllers: [ProbeController],
  providers: [
    {
      provide: ConfigService,
      useValue: {
        get: (key: string) =>
          key === 'CORS_ORIGINS' ? 'https://allowed.example, https://other.example' : undefined,
      },
    },
  ],
})
class ProbeModule {}

describe('Actual bootstrap middleware configuration (isolated HTTP app)', () => {
  let app: INestApplication;
  const oldEnv = process.env.NODE_ENV;
  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    const base = module.createNestApplication({ logger: false });
    jest.spyOn(NestFactory, 'create').mockResolvedValue(base);
    process.env.NODE_ENV = 'production';
    app = await createApp();
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    jest.restoreAllMocks();
    process.env.NODE_ENV = oldEnv;
  });
  it('sets security headers and removes framework fingerprinting', async () => {
    const res = await request(app.getHttpServer()).get('/probe').expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
  it('allows an explicitly configured browser origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('Origin', 'https://allowed.example')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example');
  });
  it('does not grant CORS access to an unlisted production origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('Origin', 'https://unlisted.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('keeps strict DTO validation and admin alias normalization enabled', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe')
      .send({ email: ' ADMIN ', password: 'fixture-password' })
      .expect(201);
    expect(res.body.email).toBe('admin');
    await request(app.getHttpServer())
      .post('/probe')
      .send({ email: 'admin', password: 'fixture-password', role: 'ADMIN' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/probe')
      .send({ email: { $ne: null }, password: 'fixture-password' })
      .expect(400);
  });
});
