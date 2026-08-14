import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pinecone } from "@pinecone-database/pinecone";

@Injectable()
export class PineconeService {
  private readonly client: Pinecone;
  private readonly indexName: string;

  constructor(configService: ConfigService) {
    this.client = new Pinecone({ apiKey: configService.getOrThrow<string>("PINECONE_API_KEY") });
    this.indexName = configService.getOrThrow<string>("PINECONE_INDEX");
  }

  async findRelevantChunks(email: string, vector: number[]) {
    const results = await this.client.index(this.indexName).namespace(email).query({
      vector,
      topK: 6,
      includeMetadata: true
    });

    return results.matches
      .map((match) => match.metadata?.text)
      .filter((text): text is string => typeof text === "string" && text.length > 0);
  }

  async deleteNamespace(email: string) {
    await this.client.index(this.indexName).namespace(email).deleteAll();
  }
}
