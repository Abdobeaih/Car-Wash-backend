"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CURRENCY = exports.WORKING_HOURS = void 0;
exports.workingStartMinutes = workingStartMinutes;
exports.workingEndMinutes = workingEndMinutes;
exports.WORKING_HOURS = {
    start: '09:00',
    end: '18:00',
    slotMinutes: 60,
    timezone: 'local',
};
function workingStartMinutes() {
    const [h, m] = exports.WORKING_HOURS.start.split(':').map(Number);
    return h * 60 + m;
}
function workingEndMinutes() {
    const [h, m] = exports.WORKING_HOURS.end.split(':').map(Number);
    return h * 60 + m;
}
exports.DEFAULT_CURRENCY = 'USD';
//# sourceMappingURL=working-hours.js.map