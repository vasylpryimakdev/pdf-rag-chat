export type DocumentStatus = "pending" | "success" | "error";

export type UserDocument = {
  id: string;
  email: string;
  fileName: string;
  status: DocumentStatus;
  errorMessage?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};