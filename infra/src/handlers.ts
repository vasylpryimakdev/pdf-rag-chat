import type { S3Event } from "aws-lambda";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function readJson<T>(key: string) {
  const object = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  if (!object.Body) throw new Error(`S3 artifact has no body: ${key}`);

  const buffer = await streamToBuffer(object.Body as NodeJS.ReadableStream);
  return JSON.parse(buffer.toString("utf8")) as T;
}

async function writeJson(key: string, value: unknown) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is required");

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(value),
      ContentType: "application/json"
    })
  );
}

function artifactKey(input: IngestionInput, name: string) {
  const documentId = createHash("sha1").update(input.key).digest("hex");
  return `processing/${documentId}/${name}.json`;
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }

  throw lastError;
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
  if (buffer.length > MAX_PDF_SIZE_BYTES) throw new Error("PDF must be 10MB or smaller");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Uploaded file is not a valid PDF");

  const parsed = await pdf(buffer);
  const text = parsed.text.trim();

  if (!text) throw new Error("No text found in PDF");

  const result = { ...input, email: document.email, textArtifactKey: artifactKey(input, "text") };
  await writeJson(result.textArtifactKey, { text });

  return result;
}

export async function chunkText(input: IngestionInput): Promise<IngestionInput> {
  if (!input.textArtifactKey) throw new Error("Text artifact is required before chunking");

  const { text } = await readJson<{ text: string }>(input.textArtifactKey);
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) throw new Error("No chunks created from PDF text");

  const result = { ...input, chunksArtifactKey: artifactKey(input, "chunks") };
  await writeJson(result.chunksArtifactKey, { chunks });

  return result;
}

export async function embedChunks(input: IngestionInput): Promise<IngestionInput> {
  if (!input.email || !input.chunksArtifactKey) throw new Error("Email and chunks artifact are required before embedding");

  const { chunks } = await readJson<{ chunks: string[] }>(input.chunksArtifactKey);

  const model = gemini.getGenerativeModel({ model: "text-embedding-004" });
  const embeddings = [];
  const batchSize = 5;

  for (let start = 0; start < chunks.length; start += batchSize) {
    const batch = chunks.slice(start, start + batchSize);
    const batchEmbeddings = await Promise.all(batch.map((chunk) => withRetry(() => model.embedContent(chunk))));
    embeddings.push(...batchEmbeddings);
  }

  const vectors = embeddings.map((item, index) => ({
    id: createHash("sha1").update(`${input.key}:${index}`).digest("hex"),
    values: item.embedding.values,
    metadata: {
      email: input.email as string,
      s3Key: input.key,
      chunkIndex: index,
      text: chunks[index] ?? ""
    }
  }));

  const result = { ...input, vectorsArtifactKey: artifactKey(input, "vectors") };
  await writeJson(result.vectorsArtifactKey, { vectors });

  return result;
}

export async function indexChunks(input: IngestionInput): Promise<IngestionInput> {
  if (!input.email || !input.vectorsArtifactKey) throw new Error("Email and vectors artifact are required before indexing");

  const indexName = process.env.PINECONE_INDEX;
  if (!indexName) throw new Error("PINECONE_INDEX is required");

  const { vectors } = await readJson<{
    vectors: Array<{
      id: string;
      values: number[];
      metadata: { email: string; s3Key: string; chunkIndex: number; text: string };
    }>;
  }>(input.vectorsArtifactKey);

  const namespace = pinecone.index(indexName).namespace(input.email);
  const batchSize = 100;

  for (let start = 0; start < vectors.length; start += batchSize) {
    await withRetry(() => namespace.upsert(vectors.slice(start, start + batchSize)));
  }

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

export async function cleanupPending() {
  await connectDb();

  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const documents = await DocumentModel.find({ status: "pending", createdAt: { $lt: cutoff } }).exec();

  await Promise.all(
    documents.map(async (document) => {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: document.s3Bucket, Key: document.s3Key }));
        await DocumentModel.updateOne(
          { _id: document._id, status: "pending" },
          { $set: { status: "error", errorMessage: "Upload or processing timed out." } }
        ).exec();
      } catch (error) {
        console.error(`Failed to clean up pending document ${document.s3Key}`, error);
      }
    })
  );

  return { cleaned: documents.length };
}
