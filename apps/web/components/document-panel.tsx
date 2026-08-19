import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
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

export function DocumentPanel({
  currentDocument,
  documentLoading,
  documentError,
  uploadError,
  uploadMutation,
  deleteMutation,
  isDragging,
  setIsDragging,
  onUpload,
}: DocumentPanelProps) {
  return (
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
          <Typography variant="h6">Source document</Typography>
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
          if (!currentDocument && !uploadMutation.isPending)
            setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!currentDocument && !uploadMutation.isPending) {
            void onUpload(event.dataTransfer.files[0]);
          }
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
            : currentDocument
              ? "Document added"
              : "Drop your PDF here"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentDocument
            ? "Remove it to upload a different file"
            : "or click to browse · PDF up to 10MB"}
        </Typography>
        <input
          hidden
          type="file"
          accept="application/pdf,.pdf"
          disabled={Boolean(currentDocument) || uploadMutation.isPending}
          onChange={(event) => {
            void onUpload(event.target.files?.[0]);
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
        <Stack spacing={1.5}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary">
            Checking your workspace...
          </Typography>
        </Stack>
      ) : currentDocument ? (
        <Stack spacing={1.5} sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
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
              We are extracting and indexing your document. This usually takes a
              moment.
            </Typography>
          ) : null}
          {currentDocument.errorMessage ? (
            <Alert severity="error">{currentDocument.errorMessage}</Alert>
          ) : null}
        </Stack>
      ) : (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", color: "text.secondary" }}
        >
          <ShieldOutlinedIcon fontSize="small" />
          <Typography variant="body2">
            Your document stays private to this workspace.
          </Typography>
        </Stack>
      )}
      {documentError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage(documentError)}
        </Alert>
      ) : null}
      {deleteMutation.error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage(deleteMutation.error)}
        </Alert>
      ) : null}
    </Paper>
  );
}
