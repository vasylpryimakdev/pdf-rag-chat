import type { S3Event } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { createHash } from "crypto";
import pdf from "pdf-parse";
import { connectDb, DocumentModel, type IngestionInput } from "./models.js";

const s3 = new S3Client({});
const stepFunctions = new SFNClient({});
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY ?? "" });

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function splitIntoChunks(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const chunkSize = 1200;
  const overlap = 180;
  const chunks: string[] = [];

  for (let start = 0; start < normalizedText.length; start += chunkSize - overlap) {
    const chunk = normalizedText.slice(start, start + chunkSize).trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

function getErrorMessage(input: IngestionInput) {
  const cause = input.workflowError?.Cause;
  if (!cause) return input.workflowError?.Error ?? "Ingestion failed";

  try {
    const parsed = JSON.parse(cause) as { errorMessage?: string };
    return parsed.errorMessage ?? cause;
  } catch {
    return cause;
  }
}

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
  await connectDb();

  const document = await DocumentModel.findOne({ s3Key: input.key }).lean().exec();
  if (!document) throw new Error(`Document metadata not found for ${input.key}`);

  const object = await s3.send(new GetObjectCommand({ Bucket: input.bucket, Key: input.key }));
  if (!object.Body) throw new Error("S3 object has no body");

  const buffer = await streamToBuffer(object.Body as NodeJS.ReadableStream);
  const parsed = await pdf(buffer);
  const text = parsed.text.trim();

  if (!text) throw new Error("No text found in PDF");

  return { ...input, email: document.email, text };
}

export async function chunkText(input: IngestionInput): Promise<IngestionInput> {
  if (!input.text) throw new Error("Text is required before chunking");

  const chunks = splitIntoChunks(input.text);
  if (chunks.length === 0) throw new Error("No chunks created from PDF text");

  return { ...input, chunks };
}

export async function embedChunks(input: IngestionInput): Promise<IngestionInput> {
  if (!input.email || !input.chunks) throw new Error("Email and chunks are required before embedding");

  const model = gemini.getGenerativeModel({ model: "text-embedding-004" });
  const embeddings = await Promise.all(input.chunks.map((chunk) => model.embedContent(chunk)));

  const vectors = embeddings.map((item, index) => ({
    id: createHash("sha1").update(`${input.key}:${index}`).digest("hex"),
    values: item.embedding.values,
    metadata: {
      email: input.email as string,
      s3Key: input.key,
      chunkIndex: index,
      text: input.chunks?.[index] ?? ""
    }
  }));

  return { ...input, vectors };
}

export async function indexChunks(input: IngestionInput): Promise<IngestionInput> {
  if (!input.email || !input.vectors) throw new Error("Email and vectors are required before indexing");

  const indexName = process.env.PINECONE_INDEX;
  if (!indexName) throw new Error("PINECONE_INDEX is required");

  await pinecone.index(indexName).namespace(input.email).upsert(input.vectors);

  return input;
}

export async function updateStatusSuccess(input: IngestionInput) {
  await connectDb();

  await DocumentModel.updateOne({ s3Key: input.key }, { $set: { status: "success" }, $unset: { errorMessage: "" } }).exec();

  return { ok: true };
}

export async function updateStatusError(input: IngestionInput) {
  await connectDb();

  const message = getErrorMessage(input).slice(0, 1000);
  await DocumentModel.updateOne({ s3Key: input.key }, { $set: { status: "error", errorMessage: message } }).exec();

  return { ok: true };
}
