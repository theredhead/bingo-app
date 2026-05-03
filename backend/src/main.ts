import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust proxy headers from Nginx Proxy Manager
  app.set("trust proxy", true);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration
  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>("FRONTEND_URL");
  app.enableCors({
    origin: frontendUrl || "*",
    credentials: true,
  });

  // Serve Angular index.html for client-side routes (e.g. /games/ABCD)
  const indexPath = join(__dirname, "..", "public", "browser", "index.html");
  app.use((req: any, res: any, next: any) => {
    const path = req.path ?? req.url ?? "";
    const isApi = path.startsWith("/api");
    const isAssetRequest = path.includes(".");

    if (req.method === "GET" && !isApi && !isAssetRequest) {
      return res.sendFile(indexPath, (error: Error | null) => {
        if (error) {
          return res.status(503).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bingo Cards</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f3e8; color: #2e2d2a; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    article { max-width: 560px; width: 100%; background: #fffef9; border: 1px solid #ded7c7; border-radius: 14px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    h1 { margin: 0 0 12px; font-size: 1.5rem; }
    p { margin: 0; line-height: 1.45; color: #55524b; }
  </style>
</head>
<body>
  <main>
    <article>
      <h1>Bingo is temporarily unavailable</h1>
      <p>The app shell could not be loaded right now. Please try refreshing in a moment.</p>
    </article>
  </main>
</body>
</html>`);
        }
        return undefined;
      });
    }

    return next();
  });

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
