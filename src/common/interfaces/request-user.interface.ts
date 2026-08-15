import { UserRole } from '../constants/roles';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
