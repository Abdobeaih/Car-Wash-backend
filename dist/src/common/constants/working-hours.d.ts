export interface WorkingHoursConfig {
    start: string;
    end: string;
    slotMinutes: number;
    timezone: string;
}
export declare const WORKING_HOURS: WorkingHoursConfig;
export declare function workingStartMinutes(): number;
export declare function workingEndMinutes(): number;
export declare const DEFAULT_CURRENCY = "USD";
