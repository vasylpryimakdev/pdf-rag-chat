import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DocumentEntity, DocumentEntityDocument } from "./schemas/document.schema";

@Injectable()
export class DocumentsService {
  constructor(@InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntityDocument>) {}

  async findCurrentByEmail(email: string) {
    return this.documentModel.findOne({ email: email.toLowerCase() }).lean().exec();
  }

  async deleteCurrentByEmail(email: string) {
    await this.documentModel.findOneAndDelete({ email: email.toLowerCase() }).exec();
  }
}
