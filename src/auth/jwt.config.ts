import { ConfigService } from '@nestjs/config';

/**
 * Resolves the JWT signing/verification secret. In production the secret MUST be
 * provided explicitly; a fallback is only acceptable in non-production so a
 * missing env var cannot silently sign tokens with a publicly known value.
 */
export function resolveJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set. Add it to your production environment.');
  }
  return 'dev-secret';
}
