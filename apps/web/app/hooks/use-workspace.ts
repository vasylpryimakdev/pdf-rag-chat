import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../lib/api";
import { ChatMessage, UserDocument } from "../types";

const EMAIL_STORAGE_KEY = "pdf-rag-chat-email";
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export function useWorkspace() {
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const documentQuery = useQuery({
    queryKey: ["document", email],
    queryFn: () =>
      request<UserDocument | null>(
        `/documents/current?email=${encodeURIComponent(email)}`,
      ),
    enabled: Boolean(email),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 2000 : false,
  });
  const currentDocument = documentQuery.data;
  const canChat = currentDocument?.status === "success";

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl } = await request<{ uploadUrl: string }>(
        "/documents/presign",
        {
          method: "POST",
          data: {
            email,
            fileName: file.name,
            contentType: "application/pdf",
            size: file.size,
          },
        },
      );
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": "application/pdf" },
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["document", email] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      request<{ ok: true }>(
        `/documents/current?email=${encodeURIComponent(email)}`,
        { method: "DELETE" },
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["document", email] });
      const previousDocument = queryClient.getQueryData<UserDocument | null>([
        "document",
        email,
      ]);
      queryClient.setQueryData<UserDocument | null>(["document", email], null);
      return { previousDocument };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(["document", email], context?.previousDocument),
    onSuccess: () => setMessages([]),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["document", email] }),
  });

  const chatMutation = useMutation({
    mutationFn: (text: string) =>
      request<{ answer: string }>("/chat", {
        method: "POST",
        data: { email, question: text },
      }),
    onSuccess: ({ answer }) =>
      setMessages((items) => [
        ...items,
        { role: "assistant", content: answer },
      ]),
  });

  useEffect(() => {
    const storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
    setEmail(storedEmail);
    setEmailInput(storedEmail);
  }, []);

  function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail) return;
    localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail);
    setEmail(normalizedEmail);
  }

  function handleSignOut() {
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    setEmail("");
    setEmailInput("");
    setQuestion("");
    setMessages([]);
  }

  async function handleUpload(file?: File) {
    setUploadError("");
    if (!file) return;
    if (currentDocument)
      return setUploadError(
        "Remove the current document before uploading another one.",
      );
    if (!file.name.toLowerCase().endsWith(".pdf"))
      return setUploadError("Only PDF files are accepted.");
    if (file.size > MAX_PDF_SIZE_BYTES)
      return setUploadError("PDF must be 10MB or smaller.");
    try {
      await uploadMutation.mutateAsync(file);
    } catch {
      // The mutation error is rendered in the upload panel.
    }
  }

  async function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || !canChat || chatMutation.isPending) return;
    setMessages((items) => [...items, { role: "user", content: text }]);
    setQuestion("");
    try {
      await chatMutation.mutateAsync(text);
    } catch {
      // The mutation error is rendered in the conversation.
    }
  }

  return {
    email,
    emailInput,
    setEmailInput,
    question,
    setQuestion,
    messages,
    uploadError,
    isDragging,
    setIsDragging,
    currentDocument,
    canChat,
    documentLoading: documentQuery.isLoading,
    documentError: documentQuery.error,
    uploadMutation,
    deleteMutation,
    chatMutation,
    handleAuth,
    handleSignOut,
    handleUpload,
    handleQuestionSubmit,
  };
}
