import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import {
  BeforeApplicationShutdown,
  Global,
  Logger,
  MiddlewareConsumer,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueOptions } from 'bullmq';
import { WinstonModule } from 'nest-winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticleModule } from './article/article.module';
import { AuthModule } from './auth/auth.module';
import { CaslModule } from './casl/casl.module';
import { ICacheConfig } from './configs/cache.config';
import configs from './configs/index.config';
import { IMongoConfig } from './configs/mongo.config';
import { MulterConfigService } from './configs/multer.config';
import { IMysqlConfig } from './configs/mysql.config';
import { ConfigEnum } from './constants/config.constant';
import { EventsModule } from './events/events.module';
import { HttpLoggerMiddleware } from './middlewares/httpLogger.middleware';
import { UserModule } from './user/user.module';
import { getEnvFilePath } from './utils/env.util';
import { UtilsModule } from './utils/utils.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      envFilePath: getEnvFilePath(),
      load: configs,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get<IMysqlConfig>(ConfigEnum.MYSQL),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get<IMongoConfig>(ConfigEnum.MONGO),
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get<ICacheConfig>(ConfigEnum.CACHE)!,
      }),
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get<QueueOptions>(ConfigEnum.BULLMQ)!,
      }),
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transports: configService.get(ConfigEnum.WINSTON),
      }),
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useClass: MulterConfigService,
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { throttlers, generateKey } = configService.get(ConfigEnum.RATELIMIT);
        return {
          throttlers,
          generateKey,
        };
      },
    }),
    UserModule,
    AuthModule,
    CaslModule,
    ArticleModule,
    UtilsModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [MulterModule],
})
export class AppModule implements OnModuleInit, BeforeApplicationShutdown, OnApplicationShutdown {
  private readonly logger = new Logger(AppModule.name);

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .exclude('user/stream') // 排除 user/stream 路由
      .forRoutes('*');
  }

  onModuleInit() {
    this.logger.log('App init ...');
  }

  async beforeApplicationShutdown(signal?: string) {
    this.logger.log(`Received close signal (${signal})，ready to close...`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  onApplicationShutdown(signal?: string) {
    this.logger.log(`App is closed (${signal}).`);
  }
}
