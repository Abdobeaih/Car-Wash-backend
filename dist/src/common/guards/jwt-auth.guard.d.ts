declare const JwtAuthGuard_base: any;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    handleRequest<TUser = unknown>(err: unknown, user: TUser, info: unknown): TUser;
}
export {};
