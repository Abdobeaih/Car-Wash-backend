import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import { UserRole } from '../common/constants/roles';
export interface SafeUser {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    emailVerified: boolean;
    phone?: string;
    countryCode?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class UsersService {
    private readonly userModel;
    constructor(userModel: Model<UserDocument>);
    create(data: {
        name: string;
        email: string;
        password: string;
        role?: UserRole;
        phone?: string;
        countryCode?: string;
    }): Promise<SafeUser>;
    findByEmail(email: string): Promise<UserDocument | null>;
    findById(id: string): Promise<SafeUser | null>;
    findByIdWithPassword(id: string): Promise<UserDocument | null>;
    updateProfile(id: string, data: {
        name?: string;
        email?: string;
    }): Promise<SafeUser | null>;
    updatePassword(id: string, password: string): Promise<void>;
    setPasswordReset(id: string, tokenHash: string, expires: Date): Promise<void>;
    clearPasswordReset(id: string): Promise<void>;
    markEmailVerified(id: string): Promise<void>;
    deleteUser(id: string): Promise<void>;
    verifyPassword(user: UserDocument, password: string): Promise<boolean>;
    private toSafeUser;
}
