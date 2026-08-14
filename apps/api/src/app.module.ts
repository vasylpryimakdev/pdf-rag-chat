import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AwsModule } from "./aws/aws.module";
import { envValidationSchema } from "./config/env.validation";
import { DocumentsModule } from "./documents/documents.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("MONGODB_URI")
      })
    }),
    AwsModule,
    DocumentsModule,
    HealthModule
  ]
})
export class AppModule {}
