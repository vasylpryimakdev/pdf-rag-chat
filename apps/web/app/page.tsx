"use client";

import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
type ChatMessage = { role: "user" | "assistant"; content: string };

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

async function request<T>(
  path: string,
  config?: Parameters<typeof api.request>[0],
) {
  const response = await api.request<T>({ url: path, ...config });
  return response.data;
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error))
    return error.response?.data?.message ?? error.message;
  return error instanceof Error ? error.message : "Something went wrong";
}

function StatusChip({ status }: { status?: DocumentStatus }) {
  const config =
    status === "success"
      ? { label: "Ready to chat", color: "success" as const }
      : status === "pending"
        ? { label: "Processing", color: "warning" as const }
        : status === "error"
          ? { label: "Processing failed", color: "error" as const }
          : { label: "No document", color: "default" as const };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      sx={{ fontWeight: 700 }}
    />
  );
}

export default function Home() {
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

  if (!email) {
    return (
      <main className="auth-page">
        <Container maxWidth="sm">
          <Paper className="auth-card" elevation={0}>
            <Avatar
              sx={{ bgcolor: "primary.main", width: 56, height: 56, mb: 3 }}
            >
              <DescriptionOutlinedIcon />
            </Avatar>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ fontWeight: 800 }}
            >
              PDF RAG Chat
            </Typography>
            <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>
              Your documents, ready for questions.
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Enter your email to open a private workspace for uploading and
              exploring one PDF.
            </Typography>
            <Box component="form" onSubmit={handleAuth}>
              <TextField
                fullWidth
                label="Work email"
                type="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="you@company.com"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                required
              />
              <Button
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                sx={{ mt: 2 }}
              >
                Open workspace
              </Button>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 3 }}
            >
              Your email is stored locally for this test workspace.
            </Typography>
          </Paper>
        </Container>
      </main>
    );
  }

  const documentLoading = documentQuery.isLoading;
  return (
    <main className="workspace-page">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, height: "100%" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            mb: 3,
            justifyContent: "space-between",
            alignItems: { md: "center" },
          }}
        >
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ fontWeight: 800 }}
            >
              PDF knowledge workspace
            </Typography>
            <Typography variant="h4">Ask your document</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "secondary.main",
                fontSize: 14,
              }}
            >
              {email[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Private workspace
              </Typography>
            </Box>
            <Tooltip title="Change email">
              <IconButton onClick={handleSignOut} aria-label="Change email">
                <LogoutOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box className="workspace-grid">
          <Paper className="document-panel" elevation={0}>
            <Stack
              direction="row"
              sx={{
                mb: 3,
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography variant="h6">Your source</Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload one PDF to ground the answers.
                </Typography>
              </Box>
              <StatusChip status={currentDocument?.status} />
            </Stack>
            <Box
              component="label"
              className={`upload-zone ${isDragging ? "is-dragging" : ""} ${currentDocument || uploadMutation.isPending ? "is-disabled" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!currentDocument) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void handleUpload(event.dataTransfer.files[0]);
              }}
            >
              {uploadMutation.isPending ? (
                <CircularProgress size={32} />
              ) : (
                <UploadFileOutlinedIcon
                  sx={{ fontSize: 38, color: "primary.main" }}
                />
              )}
              <Typography sx={{ fontWeight: 800 }}>
                {uploadMutation.isPending
                  ? "Uploading document"
                  : "Drop your PDF here"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse · PDF up to 10MB
              </Typography>
              <input
                hidden
                type="file"
                accept="application/pdf,.pdf"
                disabled={Boolean(currentDocument) || uploadMutation.isPending}
                onChange={(event) => {
                  void handleUpload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </Box>
            {uploadError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            ) : null}
            {uploadMutation.error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorMessage(uploadMutation.error)}
              </Alert>
            ) : null}
            <Divider sx={{ my: 3 }} />
            {documentLoading ? (
              <LinearProgress />
            ) : currentDocument ? (
              <Stack
                spacing={1.5}
                sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "center" }}
                >
                  <InsertDriveFileOutlinedIcon color="primary" />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>
                      {currentDocument.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF document
                    </Typography>
                  </Box>
                  <Tooltip title="Delete document">
                    <IconButton
                      color="error"
                      onClick={() => deleteMutation.mutate()}
                      disabled={
                        deleteMutation.isPending ||
                        currentDocument.status === "pending"
                      }
                      aria-label="Delete document"
                    >
                      {deleteMutation.isPending ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DeleteOutlineIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
                {currentDocument.status === "pending" ? (
                  <Typography variant="caption" color="text.secondary">
                    We are extracting and indexing your document. This usually
                    takes a moment.
                  </Typography>
                ) : null}
                {currentDocument.errorMessage ? (
                  <Alert severity="error">{currentDocument.errorMessage}</Alert>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No document uploaded yet.
              </Typography>
            )}
            {documentQuery.error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorMessage(documentQuery.error)}
              </Alert>
            ) : null}
            {deleteMutation.error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorMessage(deleteMutation.error)}
              </Alert>
            ) : null}
          </Paper>

          <Paper className="chat-panel" elevation={0}>
            <Stack
              direction="row"
              sx={{
                p: { xs: 2, md: 3 },
                borderBottom: "1px solid",
                borderColor: "divider",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h6">Conversation</Typography>
                <Typography variant="body2" color="text.secondary">
                  Answers grounded in your uploaded PDF
                </Typography>
              </Box>
              <Chip
                icon={<DescriptionOutlinedIcon />}
                label={canChat ? "Document connected" : "Waiting for document"}
                color={canChat ? "success" : "default"}
                variant="outlined"
              />
            </Stack>
            <Box className="message-list">
              {messages.length === 0 ? (
                <Box className="chat-empty">
                  <Avatar
                    sx={{
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                      width: 64,
                      height: 64,
                    }}
                  >
                    <DescriptionOutlinedIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Start with a question
                  </Typography>
                  <Typography
                    color="text.secondary"
                    align="center"
                    sx={{ maxWidth: 360 }}
                  >
                    {canChat
                      ? "Ask for a summary, a key detail, or anything you want to find in the document."
                      : "Upload and process a PDF to unlock the conversation."}
                  </Typography>
                </Box>
              ) : null}
              {messages.map((message, index) => (
                <Box
                  key={`${message.role}-${index}`}
                  className={`message-bubble ${message.role}`}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800 }}
                    color={message.role === "user" ? "inherit" : "primary.main"}
                  >
                    {message.role === "user" ? "You" : "Assistant"}
                  </Typography>
                  <Typography sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                    {message.content}
                  </Typography>
                </Box>
              ))}
              {chatMutation.isPending ? (
                <Box className="message-bubble assistant">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <CircularProgress size={16} />
                    <Typography>Thinking through your document...</Typography>
                  </Stack>
                </Box>
              ) : null}
              {chatMutation.error ? (
                <Alert severity="error">
                  {errorMessage(chatMutation.error)}
                </Alert>
              ) : null}
            </Box>
            <Box
              component="form"
              onSubmit={handleQuestionSubmit}
              sx={{
                p: { xs: 2, md: 3 },
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={
                  canChat
                    ? "Ask a question about your PDF..."
                    : "Upload and process a PDF first"
                }
                disabled={!canChat || chatMutation.isPending}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Send question">
                          <span>
                            <IconButton
                              color="primary"
                              type="submit"
                              disabled={
                                !canChat ||
                                chatMutation.isPending ||
                                !question.trim()
                              }
                              aria-label="Send question"
                            >
                              <SendRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Paper>
        </Box>
      </Container>
    </main>
  );
}
