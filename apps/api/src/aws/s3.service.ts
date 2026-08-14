import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>("S3_BUCKET");
    this.client = new S3Client({ region: configService.getOrThrow<string>("AWS_REGION") });
  }

  getBucket() {
    return this.bucket;
  }

  buildUploadKey(email: string, fileName: string) {
    const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, "_");
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `uploads/${safeEmail}/${randomUUID()}-${safeFileName}`;
  }

  async createPdfUploadUrl(key: string) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: "application/pdf"
      }),
      { expiresIn: 300 }
    );
  }
}
