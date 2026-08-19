import {
  Avatar,
  Box,
  Button,
  Container,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { FormEvent } from "react";

type AuthScreenProps = {
  emailInput: string;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthScreen({
  emailInput,
  onEmailChange,
  onSubmit,
}: AuthScreenProps) {
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
            PDF knowledge workspace
          </Typography>
          <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>
            Your documents, ready for questions.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Enter your email to open a private workspace for uploading and
            exploring one PDF.
          </Typography>
          <Box component="form" onSubmit={onSubmit}>
            <TextField
              fullWidth
              label="Work email"
              type="email"
              value={emailInput}
              onChange={(event) => onEmailChange(event.target.value)}
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
