import mongoose, { Model, Schema } from "mongoose";

export type IngestionInput = {
  bucket: string;
  key: string;
  email?: string;
  text?: string;
  chunks?: string[];
  vectors?: Array<{
    id: string;
    values: number[];
    metadata: {
      email: string;
      s3Key: string;
      chunkIndex: number;
      text: string;
    };
  }>;
  workflowError?: { Error?: string; Cause?: string };
};

export type DocumentRecord = {
  email: string;
  fileName: string;
  s3Bucket: string;
  s3Key: string;
  status: "pending" | "success" | "error";
  errorMessage?: string;
};

const documentSchema = new Schema<DocumentRecord>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    s3Bucket: { type: String, required: true },
    s3Key: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "success", "error"], required: true, default: "pending" },
    errorMessage: { type: String }
  },
  { collection: "documents", timestamps: true }
);

export const DocumentModel = (mongoose.models.Document as Model<DocumentRecord> | undefined) ?? mongoose.model<DocumentRecord>("Document", documentSchema);

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri);
}
