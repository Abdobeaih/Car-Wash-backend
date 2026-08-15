"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const bootstrap_1 = require("./src/bootstrap");
let cachedServer;
async function getServer() {
    if (!cachedServer) {
        const app = await (0, bootstrap_1.createApp)();
        await app.init();
        cachedServer = app.getHttpAdapter().getInstance();
    }
    return cachedServer;
}
async function handler(req, res) {
    const server = await getServer();
    return server(req, res);
}
//# sourceMappingURL=serverless.js.map