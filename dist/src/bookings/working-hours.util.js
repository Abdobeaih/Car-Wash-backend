"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slotMinutes = slotMinutes;
exports.workingStartMinutes = workingStartMinutes;
exports.workingEndMinutes = workingEndMinutes;
exports.toMinutes = toMinutes;
exports.toHHMM = toHHMM;
function slotMinutes() {
    return 60;
}
function workingStartMinutes() {
    return 9 * 60;
}
function workingEndMinutes() {
    return 18 * 60;
}
function toMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}
function toHHMM(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
//# sourceMappingURL=working-hours.util.js.map