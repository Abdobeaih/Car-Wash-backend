import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      if (info instanceof TokenExpiredError) {
        throw new UnauthorizedException('Session expired. Please log in again.');
      }
      if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid authentication token.');
      }
      throw new UnauthorizedException('Authentication required.');
    }
    return user;
  }
}
