import type { Metadata } from "next";
import { QueryProvider } from "./query-provider";
import "./styles.css";

export const metadata: Metadata = {
  title: "PDF RAG Chat",
  description: "Ask questions based on an uploaded PDF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
