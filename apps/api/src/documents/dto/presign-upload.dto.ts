import { Equals, IsEmail, IsInt, IsString, Max, Min } from "class-validator";

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export class PresignUploadDto {
  @IsEmail()
  email!: string;

  @IsString()
  fileName!: string;

  @Equals("application/pdf")
  contentType!: "application/pdf";

  @IsInt()
  @Min(1)
  @Max(MAX_PDF_SIZE_BYTES)
  size!: number;
}
