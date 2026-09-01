/**
 * Regression test for `property phone should not exist` (400).
 * See src/bootstrap.ts — the global pipe uses whitelist + forbidNonWhitelisted,
 * so any request-body field not declared on its DTO is rejected.
 */
import {
  ValidationPipe,
  BadRequestException,
  type ArgumentMetadata,
  type Type,
} from '@nestjs/common';
import { UpdateProfileDto } from '../src/auth/dto/update-profile.dto';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { OtpChannel } from '../src/otp/schemas/otp.schema';

describe('Global ValidationPipe (whitelist + forbidNonWhitelisted)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  const body = (metatype: Type): ArgumentMetadata => ({
    type: 'body',
    metatype,
  });

  const validationMessages = async (value: unknown, metatype: Type) => {
    try {
      await pipe.transform(value, body(metatype));
      fail('expected the request to be rejected');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const res = (err as BadRequestException).getResponse() as { message?: string | string[] };
      return Array.isArray(res.message) ? res.message.join(' | ') : (res.message ?? '');
    }
    return '';
  };

  it('accepts phone in a profile update (the previously failing request)', async () => {
    await expect(
      pipe.transform({ name: 'Jane', phone: '+14155552671' }, body(UpdateProfileDto)),
    ).resolves.toMatchObject({ phone: '+14155552671' });
  });

  it('accepts a profile update without phone', async () => {
    await expect(pipe.transform({ name: 'Jane' }, body(UpdateProfileDto))).resolves.toMatchObject({
      name: 'Jane',
    });
  });

  it('rejects a malformed phone on profile update', async () => {
    const messages = await validationMessages({ phone: 'abc' }, UpdateProfileDto);
    expect(messages).toContain('Phone must be in international format');
  });

  it('still rejects unknown fields (no policy change)', async () => {
    const messages = await validationMessages({ name: 'Jane', unexpected: true }, UpdateProfileDto);
    expect(messages).toContain('property unexpected should not exist');
  });

  it('accepts the register SMS payload (phone + countryCode + channel)', async () => {
    const payload = {
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      verificationChannel: OtpChannel.SMS,
      phone: '+14155552671',
      countryCode: 'US',
    };
    await expect(pipe.transform(payload, body(RegisterDto))).resolves.toMatchObject({
      phone: '+14155552671',
      countryCode: 'US',
    });
  });

  it('accepts the register email payload without phone', async () => {
    const payload = {
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      verificationChannel: OtpChannel.EMAIL,
    };
    await expect(pipe.transform(payload, body(RegisterDto))).resolves.toMatchObject({
      email: 'new@example.com',
    });
  });
});
