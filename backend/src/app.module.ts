import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { WordlistsModule } from "./wordlists/wordlists.module";
import { BingoModule } from "./bingo/bingo.module";
import { ConfigModule as AppConfigModule } from "./config/config.module";
import { GamesModule } from "./games/games.module";
import { HoldemModule } from "./holdem/holdem.module";
import { ChatModule } from "./chat/chat.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "sqlite",
        database: configService.get<string>("DATABASE_PATH", "./db.sqlite"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: true, // Disable in production, use migrations
        logging: configService.get<string>("NODE_ENV") !== "production",
      }),
    }),

    // Static file serving (Angular build output)
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          rootPath: join(__dirname, "..", "public", "browser"),
          exclude: ["/api/(.*)"],
          serveStaticOptions: {
            fallthrough: true,
          },
        },
      ],
    }),

    // Feature modules
    WordlistsModule,
    BingoModule,
    GamesModule,
    AppConfigModule,
    HoldemModule,
    ChatModule,
  ],
})
export class AppModule {}
