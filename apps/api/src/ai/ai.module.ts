import { Module } from "@nestjs/common";
import { OpenAiService } from "./openai.service";
import { PineconeService } from "./pinecone.service";

@Module({
  providers: [OpenAiService, PineconeService],
  exports: [OpenAiService, PineconeService]
})
export class AiModule {}
