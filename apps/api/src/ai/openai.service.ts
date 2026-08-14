import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({ apiKey: configService.getOrThrow<string>("OPENAI_API_KEY") });
  }

  async embed(text: string) {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });

    return response.data[0].embedding;
  }

  async answerFromContext(question: string, chunks: string[]) {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Answer only from the provided PDF context. If the context does not contain the answer, say that you cannot find it in the document."
        },
        {
          role: "user",
          content: `Context:\n${chunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join("\n\n")}\n\nQuestion: ${question}`
        }
      ]
    });

    return response.choices[0].message.content ?? "No answer generated.";
  }
}
