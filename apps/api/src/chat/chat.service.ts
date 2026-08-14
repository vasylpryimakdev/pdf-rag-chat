import { ConflictException, Injectable } from "@nestjs/common";
import { OpenAiService } from "../ai/openai.service";
import { PineconeService } from "../ai/pinecone.service";
import { DocumentsService } from "../documents/documents.service";
import { AskQuestionDto } from "./dto/ask-question.dto";

@Injectable()
export class ChatService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly openAiService: OpenAiService,
    private readonly pineconeService: PineconeService
  ) {}

  async ask(dto: AskQuestionDto) {
    const email = dto.email.toLowerCase();
    const document = await this.documentsService.findCurrentByEmail(email);
    if (!document || document.status !== "success") {
      throw new ConflictException("Upload and process a PDF before asking questions.");
    }

    const questionVector = await this.openAiService.embed(dto.question);
    const chunks = await this.pineconeService.findRelevantChunks(email, questionVector);
    if (chunks.length === 0) {
      return { answer: "I could not find relevant information in the uploaded PDF." };
    }

    const answer = await this.openAiService.answerFromContext(dto.question, chunks);
    return { answer };
  }
}
