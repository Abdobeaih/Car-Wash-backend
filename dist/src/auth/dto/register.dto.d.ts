import { UserRole } from '../../common/constants/roles';
export declare class RegisterDto {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: UserRole;
}
