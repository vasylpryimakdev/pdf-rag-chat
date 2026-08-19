"use client";

import { Box, Container } from "@mui/material";
import { AuthScreen } from "../components/auth-screen";
import { ChatPanel } from "../components/chat-panel";
import { DocumentPanel } from "../components/document-panel";
import { WorkspaceHeader } from "../components/workspace-header";
import { useWorkspace } from "./hooks/use-workspace";

export default function Home() {
  const workspace = useWorkspace();

  if (!workspace.email) {
    return <AuthScreen emailInput={workspace.emailInput} onEmailChange={workspace.setEmailInput} onSubmit={workspace.handleAuth} />;
  }

  return (
    <main className="workspace-page">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, height: "100%" }}>
        <WorkspaceHeader email={workspace.email} onSignOut={workspace.handleSignOut} />
        <Box className="workspace-grid">
          <DocumentPanel
            currentDocument={workspace.currentDocument}
            documentLoading={workspace.documentLoading}
            documentError={workspace.documentError}
            uploadError={workspace.uploadError}
            uploadMutation={workspace.uploadMutation}
            deleteMutation={workspace.deleteMutation}
            isDragging={workspace.isDragging}
            setIsDragging={workspace.setIsDragging}
            onUpload={workspace.handleUpload}
          />
          <ChatPanel
            canChat={workspace.canChat}
            messages={workspace.messages}
            question={workspace.question}
            setQuestion={workspace.setQuestion}
            isPending={workspace.chatMutation.isPending}
            error={workspace.chatMutation.error}
            onSubmit={workspace.handleQuestionSubmit}
          />
        </Box>
      </Container>
    </main>
  );
}