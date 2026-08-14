# PDF RAG Chat

Test task implementation for a PDF-based AI chat application.

## Stack

- Frontend: Next.js, React, TypeScript, TanStack Query
- Backend: NestJS, TypeScript, MongoDB/Mongoose
- File storage: AWS S3 with presigned upload URLs
- Workflow: AWS Step Functions and AWS Lambda
- AI: OpenAI embeddings and chat completions
- Vector DB: Pinecone

## Project Structure

```text
apps/
  web/      # Next.js frontend
  api/      # NestJS backend
infra/      # Serverless Framework, Lambda handlers, Step Functions
```

## Application Flow

1. User enters an email on the frontend.
2. Frontend stores the email in `localStorage` and treats the user as authenticated.
3. User requests a PDF upload URL from `POST /documents/presign`.
4. Backend validates one PDF per user, max 10MB, creates MongoDB document metadata with `pending` status, and returns a presigned S3 URL.
5. Frontend uploads the PDF directly to S3 with the presigned URL.
6. S3 `ObjectCreated` event starts a Step Functions execution.
7. Workflow runs `ExtractText -> ChunkText -> EmbedChunks -> IndexChunks -> UpdateStatusSuccess`.
8. Any workflow error goes to `UpdateStatusError`.
9. Frontend polls `GET /documents/current?email=...` every 2 seconds while status is `pending`.
10. When status is `success`, chat is enabled.
11. Frontend sends questions to `POST /chat`.
12. Backend embeds the question, searches Pinecone, sends relevant chunks to OpenAI, and returns the answer.

## API Endpoints

```text
GET /health
GET /documents/current?email=user@example.com
POST /documents/presign
DELETE /documents/current?email=user@example.com
POST /chat
```

`POST /documents/presign` body:

```json
{
  "email": "user@example.com",
  "fileName": "document.pdf",
  "contentType": "application/pdf",
  "size": 123456
}
```

`POST /chat` body:

```json
{
  "email": "user@example.com",
  "question": "What is this document about?"
}
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp infra/.env.example infra/.env
```

Run backend:

```bash
npm run dev -w apps/api
```

Run frontend:

```bash
npm run dev -w apps/web
```

## Environment Variables

API:

```text
PORT=4000
WEB_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/pdf-rag-chat
AWS_REGION=us-east-1
S3_BUCKET=your-upload-bucket
OPENAI_API_KEY=sk-your-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=pdf-rag-chat
```

Web:

```text
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Infra:

```text
AWS_REGION=us-east-1
S3_BUCKET=your-upload-bucket
MONGODB_URI=mongodb://localhost:27017/pdf-rag-chat
OPENAI_API_KEY=sk-your-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=pdf-rag-chat
```

## AWS Deployment

The ingestion workflow is deployed from `infra` via Serverless Framework:

```bash
npm run deploy -w infra
```

The S3 bucket must exist before deployment. The Serverless config uses `existing: true` for the S3 trigger.

The deployed workflow listens for:

```text
s3:ObjectCreated:Put
prefix: uploads/
suffix: .pdf
```

## Validation Rules

- Email is stored in `localStorage`.
- Only one PDF document per email is allowed.
- PDF max size is 10MB.
- Upload content type must be `application/pdf`.
- Chat is disabled until document status is `success`.

## Useful Commands

```bash
npm run typecheck
npm run build
npm run lint
npm run typecheck -w apps/api
npm run typecheck -w apps/web
npm run typecheck -w infra
```

## Notes

- Chat history is kept in frontend state only because persistent chat history is not required by the task.
- Lambda handlers update MongoDB directly instead of calling the NestJS API, which keeps local tunneling or public API callbacks out of scope.
- Pinecone namespace is the user email, which makes retrieval and cleanup straightforward.
