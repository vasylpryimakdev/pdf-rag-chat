import { Chip } from "@mui/material";
import { DocumentStatus } from "../app/types";

export function StatusChip({ status }: { status?: DocumentStatus }) {
  const config = status === "success"
    ? { label: "Ready to chat", color: "success" as const }
    : status === "pending"
      ? { label: "Processing", color: "warning" as const }
      : status === "error"
        ? { label: "Processing failed", color: "error" as const }
        : { label: "No document", color: "default" as const };

  return <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 700 }} />;
}