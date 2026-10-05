"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const platform_ws_1 = require("@nestjs/platform-ws");
const dotenv = require("dotenv");
dotenv.config();
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useWebSocketAdapter(new platform_ws_1.WsAdapter(app));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    const port = process.env.PORT || 3001;
    await app.listen(port);
    logger.log(`🚀 SABCQ AI Counselor NestJS Backend running on: http://localhost:${port}`);
    logger.log(`📌 Session Start API: POST http://localhost:${port}/api/v1/ai-counselor/session/start`);
    logger.log(`📌 Chat API: POST http://localhost:${port}/api/v1/ai-counselor/chat`);
}
bootstrap();
//# sourceMappingURL=main.js.map