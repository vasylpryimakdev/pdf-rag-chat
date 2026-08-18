"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const EMAIL_STORAGE_KEY = "pdf-rag-chat-email";
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

type DocumentStatus = "pending" | "success" | "error";

type UserDocument = {
  id: string;
  email: string;
  fileName: string;
  status: DocumentStatus;
  errorMessage?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const documentQuery = useQuery({
    queryKey: ["document", email],
    queryFn: () => api<UserDocument | null>(`/documents/current?email=${encodeURIComponent(email)}`),
    enabled: Boolean(email),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 2000 : false)
  });

  const currentDocument = documentQuery.data;
  const canChat = currentDocument?.status === "success";

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl } = await api<{ uploadUrl: string; key: string }>("/documents/presign", {
        method: "POST",
        body: JSON.stringify({
          email,
          fileName: file.name,
          contentType: "application/pdf",
          size: file.size
        })
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file
      });

      if (!uploadResponse.ok) throw new Error("S3 upload failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document", email] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => api<{ ok: true }>(`/documents/current?email=${encodeURIComponent(email)}`, { method: "DELETE" }),
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["document", email] });
    }
  });

  const chatMutation = useMutation({
    mutationFn: (text: string) =>
      api<{ answer: string }>("/chat", {
        method: "POST",
        body: JSON.stringify({ email, question: text })
      }),
    onSuccess: ({ answer }) => setMessages((items) => [...items, { role: "assistant", content: answer }])
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

    if (currentDocument) {
      setUploadError("Delete the current PDF before uploading another one.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are accepted.");
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setUploadError("PDF must be 10MB or smaller.");
      return;
    }

    await uploadMutation.mutateAsync(file);
  }

  async function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = question.trim();
    if (!text || !canChat || chatMutation.isPending) return;

    setMessages((items) => [...items, { role: "user", content: text }]);
    setQuestion("");
    await chatMutation.mutateAsync(text);
  }

  const statusLabel = !currentDocument
    ? "Upload a document first"
    : currentDocument.status === "pending"
      ? "Document is processing"
      : currentDocument.status === "error"
        ? "Processing failed"
        : "Document is ready";

  if (!email) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">PDF RAG Chat</p>
          <h1>Enter your email to continue</h1>
          <p className="muted">This emulates authentication for the test task.</p>

          <form className="auth-form" onSubmit={handleAuth}>
            <input type="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="you@example.com" required />
            <button type="submit">Continue</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar panel">
        <p className="eyebrow">Signed in as</p>
        <h2>{email}</h2>

        <label className={currentDocument ? "dropzone disabled" : "dropzone"}>
          <span>Upload PDF</span>
          <small>Only one file, max 10MB</small>
          <input type="file" accept="application/pdf,.pdf" disabled={Boolean(currentDocument) || uploadMutation.isPending} onChange={(event) => handleUpload(event.target.files?.[0])} />
        </label>

        {uploadError ? <p className="error-text">{uploadError}</p> : null}
        {uploadMutation.error ? <p className="error-text">{uploadMutation.error.message}</p> : null}

        {currentDocument ? (
          <div className="document-card">
            <span className={`document-status ${currentDocument.status}`}>{currentDocument.status}</span>
            <strong>{currentDocument.fileName}</strong>
            {currentDocument.errorMessage ? <small className="error-text">{currentDocument.errorMessage}</small> : null}
            <button type="button" className="secondary-button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending || currentDocument.status === "pending"}>
              {currentDocument.status === "pending" ? "Processing..." : "Delete file"}
            </button>
          </div>
        ) : (
          <p className="muted">No document uploaded yet.</p>
        )}

        <button type="button" className="secondary-button" onClick={handleSignOut}>
          Change email
        </button>
      </aside>

      <section className="chat panel">
        <div className="chat-header">
          <div>
            <p className="eyebrow">Chat</p>
            <h1>Ask your PDF</h1>
          </div>
          <span className="status-pill">{statusLabel}</span>
        </div>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>No messages yet</h2>
              <p>{canChat ? "Ask a question based on your uploaded PDF." : "Upload and process a PDF before asking questions."}</p>
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
              {message.content}
            </div>
          ))}

          {chatMutation.isPending ? <div className="message assistant">Thinking...</div> : null}
          {chatMutation.error ? <p className="error-text">{chatMutation.error.message}</p> : null}
        </div>

        <form className="chat-form" onSubmit={handleQuestionSubmit}>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={canChat ? "Ask a question..." : "Upload and process a PDF first"} disabled={!canChat || chatMutation.isPending} />
          <button type="submit" disabled={!canChat || chatMutation.isPending || !question.trim()}>
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
