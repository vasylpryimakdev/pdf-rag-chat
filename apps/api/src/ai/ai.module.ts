import { Module } from "@nestjs/common";
import { GeminiService } from "./gemini.service";
import { PineconeService } from "./pinecone.service";

@Module({
  providers: [GeminiService, PineconeService],
  exports: [GeminiService, PineconeService]
})
export class AiModule {}
