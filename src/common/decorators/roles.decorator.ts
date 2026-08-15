import { SetMetadata } from '@nestjs/common';
import { UserRole, ROLES_KEY } from '../constants/roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
