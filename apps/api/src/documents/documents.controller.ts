import { Controller, Delete, Get, Query } from "@nestjs/common";
import { CurrentDocumentQueryDto } from "./dto/current-document-query.dto";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("current")
  async getCurrent(@Query() query: CurrentDocumentQueryDto) {
    const document = await this.documentsService.findCurrentByEmail(query.email);
    if (!document) return null;

    return {
      id: document._id.toString(),
      email: document.email,
      fileName: document.fileName,
      status: document.status,
      errorMessage: document.errorMessage
    };
  }

  @Delete("current")
  async deleteCurrent(@Query() query: CurrentDocumentQueryDto) {
    await this.documentsService.deleteCurrentByEmail(query.email);
    return { ok: true };
  }
}
