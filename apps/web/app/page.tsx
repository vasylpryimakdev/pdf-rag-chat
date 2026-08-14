"use client";

import { FormEvent, useEffect, useState } from "react";

const EMAIL_STORAGE_KEY = "pdf-rag-chat-email";

export default function Home() {
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState("");

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
  }

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
          <span className="status-pill">Upload a document first</span>
        </div>

        <div className="empty-state">
          <h2>No messages yet</h2>
          <p>Upload a PDF before asking questions. The upload and polling UI will be added next.</p>
        </div>

        <form className="chat-form">
          <input placeholder="Upload and process a PDF first" disabled />
          <button type="button" disabled>
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
