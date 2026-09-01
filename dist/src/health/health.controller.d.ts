import { Connection } from 'mongoose';
export declare class HealthController {
    private readonly connection;
    constructor(connection: Connection);
    check(): Promise<{
        status: string;
        database: string;
        timestamp: string;
    }>;
}
