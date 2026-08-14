import Joi from "joi";

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(4000),
  WEB_ORIGIN: Joi.string().uri().default("http://localhost:3000"),
  MONGODB_URI: Joi.string().required(),
  AWS_REGION: Joi.string().default("us-east-1"),
  S3_BUCKET: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  PINECONE_API_KEY: Joi.string().required(),
  PINECONE_INDEX: Joi.string().required()
});
