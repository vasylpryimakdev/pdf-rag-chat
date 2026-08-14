import type { S3Event } from "aws-lambda";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

type IngestionInput = {
  bucket: string;
  key: string;
  text?: string;
  chunks?: string[];
  embeddings?: Array<{ id: string; values: number[]; metadata: Record<string, string | number> }>;
  workflowError?: { Error?: string; Cause?: string };
};

const stepFunctions = new SFNClient({});

export async function startIngestion(event: S3Event) {
  const stateMachineArn = process.env.STATE_MACHINE_ARN;
  if (!stateMachineArn) throw new Error("STATE_MACHINE_ARN is required");

  await Promise.all(
    event.Records.map((record) => {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      return stepFunctions.send(
        new StartExecutionCommand({
          stateMachineArn,
          input: JSON.stringify({ bucket, key })
        })
      );
    })
  );
}

export async function extractText(input: IngestionInput): Promise<IngestionInput> {
  console.log("ExtractText", { bucket: input.bucket, key: input.key });
  return { ...input, text: "TODO: extract PDF text from S3 object" };
}

export async function chunkText(input: IngestionInput): Promise<IngestionInput> {
  console.log("ChunkText", { key: input.key });
  return { ...input, chunks: input.text ? [input.text] : [] };
}

export async function embedChunks(input: IngestionInput): Promise<IngestionInput> {
  console.log("EmbedChunks", { key: input.key, chunks: input.chunks?.length ?? 0 });
  return { ...input, embeddings: [] };
}

export async function indexChunks(input: IngestionInput): Promise<IngestionInput> {
  console.log("IndexChunks", { key: input.key, embeddings: input.embeddings?.length ?? 0 });
  return input;
}

export async function updateStatusSuccess(input: IngestionInput) {
  console.log("UpdateStatusSuccess", { key: input.key });
  return { ok: true };
}

export async function updateStatusError(input: IngestionInput) {
  console.error("UpdateStatusError", { key: input.key, error: input.workflowError });
  return { ok: true };
}
