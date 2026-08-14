import { IsEmail } from "class-validator";

export class CurrentDocumentQueryDto {
  @IsEmail()
  email!: string;
}
