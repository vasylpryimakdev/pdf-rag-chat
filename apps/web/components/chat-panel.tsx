import { Alert, Avatar, Box, Chip, CircularProgress, IconButton, InputAdornment, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { FormEvent } from "react";
import { errorMessage } from "../app/lib/api";
import { ChatMessage } from "../app/types";

type ChatPanelProps = { canChat: boolean; messages: ChatMessage[]; question: string; setQuestion: (value: string) => void; isPending: boolean; error: unknown; onSubmit: (event: FormEvent<HTMLFormElement>) => void };

export function ChatPanel({ canChat, messages, question, setQuestion, isPending, error, onSubmit }: ChatPanelProps) {
  return (
    <Paper className="chat-panel" elevation={0}>
      <Stack direction="row" sx={{ p: { xs: 2, md: 3 }, borderBottom: "1px solid", borderColor: "divider", justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="h6">Conversation</Typography><Typography variant="body2" color="text.secondary">Answers grounded in your uploaded PDF</Typography></Box><Chip icon={<DescriptionOutlinedIcon />} label={canChat ? "Document connected" : "Waiting for document"} color={canChat ? "success" : "default"} variant="outlined" /></Stack>
      <Box className="message-list">
        {messages.length === 0 ? <Box className="chat-empty"><Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), color: "primary.main", width: 64, height: 64 }}><DescriptionOutlinedIcon fontSize="large" /></Avatar><Typography variant="h6" sx={{ mt: 2 }}>Start with a question</Typography><Typography color="text.secondary" align="center" sx={{ maxWidth: 360 }}>{canChat ? "Ask for a summary, a key detail, or anything you want to find in the document." : "Upload and process a PDF to unlock the conversation."}</Typography></Box> : null}
        {messages.map((message, index) => <Box key={`${message.role}-${index}`} className={`message-bubble ${message.role}`}><Typography variant="caption" sx={{ fontWeight: 800 }} color={message.role === "user" ? "inherit" : "primary.main"}>{message.role === "user" ? "You" : "Assistant"}</Typography><Typography sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>{message.content}</Typography></Box>)}
        {isPending ? <Box className="message-bubble assistant"><Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><CircularProgress size={16} /><Typography>Thinking through your document...</Typography></Stack></Box> : null}
        {error ? <Alert severity="error">{errorMessage(error)}</Alert> : null}
      </Box>
      <Box component="form" onSubmit={onSubmit} sx={{ p: { xs: 2, md: 3 }, borderTop: "1px solid", borderColor: "divider" }}><TextField fullWidth multiline maxRows={4} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={canChat ? "Ask a question about your PDF..." : "Upload and process a PDF first"} disabled={!canChat || isPending} slotProps={{ input: { endAdornment: <InputAdornment position="end"><Tooltip title="Send question"><span><IconButton color="primary" type="submit" disabled={!canChat || isPending || !question.trim()} aria-label="Send question"><SendRoundedIcon /></IconButton></span></Tooltip></InputAdornment> } }} /></Box>
    </Paper>
  );
}