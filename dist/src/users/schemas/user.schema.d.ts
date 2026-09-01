import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../common/constants/roles';
export type UserDocument = HydratedDocument<User>;
export declare class User {
    name: string;
    email: string;
    password: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerified: boolean;
    emailVerifiedAt?: Date;
    role: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const UserSchema: any;
