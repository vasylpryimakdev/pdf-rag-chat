import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";

type WorkspaceHeaderProps = { email: string; onSignOut: () => void };

export function WorkspaceHeader({ email, onSignOut }: WorkspaceHeaderProps) {
  return (
    <Box component="header" className="workspace-header">
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2.5}
        className="workspace-header-row"
      >
        <Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", mb: 1 }}
          >
            <AutoAwesomeOutlinedIcon
              sx={{ color: "primary.main", fontSize: 18 }}
            />
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ fontWeight: 800 }}
            >
              PDF RAG Chat
            </Typography>
          </Stack>
          <Typography variant="h4">Ask your document</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            A focused space for understanding what matters.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25} className="profile-pill">
          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: "secondary.main",
              fontSize: 14,
            }}
          >
            {email[0].toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Private workspace
            </Typography>
          </Box>
          <Tooltip title="Change email">
            <IconButton
              onClick={onSignOut}
              aria-label="Change email"
              size="small"
            >
              <LogoutOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
