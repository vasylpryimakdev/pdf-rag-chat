import { Alert, Box, CircularProgress, Divider, IconButton, LinearProgress, Paper, Stack, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { errorMessage } from "../app/lib/api";
import { UserDocument } from "../app/types";
import { StatusChip } from "./status-chip";

type DocumentPanelProps = {
  currentDocument: UserDocument | null | undefined;
  documentLoading: boolean;
  documentError: unknown;
  uploadError: string;
  uploadMutation: { isPending: boolean; error: unknown };
  deleteMutation: { isPending: boolean; error: unknown; mutate: () => void };
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  onUpload: (file?: File) => Promise<void>;
};

export function DocumentPanel({ currentDocument, documentLoading, documentError, uploadError, uploadMutation, deleteMutation, isDragging, setIsDragging, onUpload }: DocumentPanelProps) {
  return (
    <Paper className="document-panel" elevation={0}>
      <Stack direction="row" sx={{ mb: 3, justifyContent: "space-between", alignItems: "flex-start" }}><Box><Typography variant="h6">Your source</Typography><Typography variant="body2" color="text.secondary">Upload one PDF to ground the answers.</Typography></Box><StatusChip status={currentDocument?.status} /></Stack>
      <Box component="label" className={`upload-zone ${isDragging ? "is-dragging" : ""} ${currentDocument || uploadMutation.isPending ? "is-disabled" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!currentDocument) setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); void onUpload(event.dataTransfer.files[0]); }}>
        {uploadMutation.isPending ? <CircularProgress size={32} /> : <UploadFileOutlinedIcon sx={{ fontSize: 38, color: "primary.main" }} />}
        <Typography sx={{ fontWeight: 800 }}>{uploadMutation.isPending ? "Uploading document" : "Drop your PDF here"}</Typography>
        <Typography variant="body2" color="text.secondary">or click to browse · PDF up to 10MB</Typography>
        <input hidden type="file" accept="application/pdf,.pdf" disabled={Boolean(currentDocument) || uploadMutation.isPending} onChange={(event) => { void onUpload(event.target.files?.[0]); event.target.value = ""; }} />
      </Box>
      {uploadError ? <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert> : null}
      {uploadMutation.error ? <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(uploadMutation.error)}</Alert> : null}
      <Divider sx={{ my: 3 }} />
      {documentLoading ? <LinearProgress /> : currentDocument ? <Stack spacing={1.5} sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}><Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}><InsertDriveFileOutlinedIcon color="primary" /><Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontWeight: 700 }} noWrap>{currentDocument.fileName}</Typography><Typography variant="caption" color="text.secondary">PDF document</Typography></Box><Tooltip title="Delete document"><IconButton color="error" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending || currentDocument.status === "pending"} aria-label="Delete document">{deleteMutation.isPending ? <CircularProgress size={20} /> : <DeleteOutlineIcon />}</IconButton></Tooltip></Stack>{currentDocument.status === "pending" ? <Typography variant="caption" color="text.secondary">We are extracting and indexing your document. This usually takes a moment.</Typography> : null}{currentDocument.errorMessage ? <Alert severity="error">{currentDocument.errorMessage}</Alert> : null}</Stack> : <Typography variant="body2" color="text.secondary">No document uploaded yet.</Typography>}
      {documentError ? <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(documentError)}</Alert> : null}
      {deleteMutation.error ? <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(deleteMutation.error)}</Alert> : null}
    </Paper>
  );
}