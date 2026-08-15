import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { Model } from 'mongoose';
import { UserDocument } from '../../users/schemas/user.schema';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { UserRole } from '../../common/constants/roles';
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userModel;
    constructor(configService: ConfigService, userModel: Model<UserDocument>);
    validate(payload: JwtPayload): Promise<RequestUser>;
}
export {};
