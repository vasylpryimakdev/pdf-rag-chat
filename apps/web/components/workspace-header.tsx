import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

type WorkspaceHeaderProps = { email: string; onSignOut: () => void };

export function WorkspaceHeader({ email, onSignOut }: WorkspaceHeaderProps) {
  return (
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
          <IconButton onClick={onSignOut} aria-label="Change email">
            <LogoutOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
