"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.bootstrap = bootstrap;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function configureApp(app) {
    const config = app.get(config_1.ConfigService);
    const origins = new Set((config.get('CORS_ORIGINS') ?? 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean));
    if (process.env.NODE_ENV !== 'production') {
        origins.add('http://localhost:3000');
        origins.add('http://127.0.0.1:3000');
    }
    app.enableCors({
        origin(origin, callback) {
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
                return;
            }
            if (!origin || origins.has(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
}
async function createApp() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    await configureApp(app);
    return app;
}
async function bootstrap() {
    const app = await createApp();
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT') ?? 3001;
    await app.listen(port);
    common_1.Logger.log(`API running at http://localhost:${port}`, 'Bootstrap');
    common_1.Logger.log(`Health check at http://localhost:${port}/health`, 'Bootstrap');
}
//# sourceMappingURL=bootstrap.js.map