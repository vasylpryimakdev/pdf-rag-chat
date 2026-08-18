import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GeminiService {
  private readonly client: GoogleGenerativeAI;

  constructor(configService: ConfigService) {
    this.client = new GoogleGenerativeAI(configService.getOrThrow<string>("GEMINI_API_KEY"));
  }

  async embed(text: string) {
    const model = this.client.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);

    return result.embedding.values;
  }

  async answerFromContext(question: string, chunks: string[]) {
    const model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = [
      "Answer only from the provided PDF context.",
      "If the context does not contain the answer, say that you cannot find it in the document.",
      "",
      "Context:",
      chunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join("\n\n"),
      "",
      `Question: ${question}`
    ].join("\n");

    const result = await model.generateContent(prompt);

    return result.response.text() || "No answer generated.";
  }
}
