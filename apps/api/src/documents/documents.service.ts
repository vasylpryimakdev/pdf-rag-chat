import { ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PineconeService } from "../ai/pinecone.service";
import { S3Service } from "../aws/s3.service";
import { PresignUploadDto } from "./dto/presign-upload.dto";
import { DocumentEntity, DocumentEntityDocument } from "./schemas/document.schema";

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntityDocument>,
    private readonly s3Service: S3Service,
    private readonly pineconeService: PineconeService
  ) {}

  async createPresignedUpload(dto: PresignUploadDto) {
    const email = dto.email.toLowerCase();
    const existingDocument = await this.documentModel.exists({ email }).exec();
    if (existingDocument) {
      throw new ConflictException("Only one PDF per user is allowed. Delete the existing file first.");
    }

    const key = this.s3Service.buildUploadKey(email, dto.fileName);
    await this.documentModel.create({
      email,
      fileName: dto.fileName,
      s3Bucket: this.s3Service.getBucket(),
      s3Key: key,
      status: "pending"
    });

    const uploadUrl = await this.s3Service.createPdfUploadUrl(key);
    return { uploadUrl, key };
  }

  async findCurrentByEmail(email: string) {
    return this.documentModel.findOne({ email: email.toLowerCase() }).lean().exec();
  }

  async deleteCurrentByEmail(email: string) {
    const document = await this.documentModel.findOne({ email: email.toLowerCase() }).exec();
    if (!document) return;

    if (document.status === "pending") {
      throw new ConflictException("The PDF cannot be deleted while it is being processed.");
    }

    await this.documentModel.deleteOne({ _id: document._id, status: document.status }).exec();

    await Promise.all([this.s3Service.deleteObject(document.s3Key), this.pineconeService.deleteNamespace(document.email)]);
  }
}
