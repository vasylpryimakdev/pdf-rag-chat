import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type DocumentStatus = "pending" | "success" | "error";
export type DocumentEntityDocument = HydratedDocument<DocumentEntity>;

@Schema({ collection: "documents", timestamps: true })
export class DocumentEntity {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true })
  s3Bucket!: string;

  @Prop({ required: true, unique: true })
  s3Key!: string;

  @Prop({ required: true, enum: ["pending", "success", "error"], default: "pending" })
  status!: DocumentStatus;

  @Prop()
  errorMessage?: string;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentEntity);
