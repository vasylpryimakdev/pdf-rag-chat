import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AiModule } from "../ai/ai.module";
import { AwsModule } from "../aws/aws.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { DocumentEntity, DocumentSchema } from "./schemas/document.schema";

@Module({
  imports: [AiModule, AwsModule, MongooseModule.forFeature([{ name: DocumentEntity.name, schema: DocumentSchema }])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService]
})
export class DocumentsModule {}
