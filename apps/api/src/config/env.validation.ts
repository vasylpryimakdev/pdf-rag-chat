import Joi from "joi";

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(4000),
  WEB_ORIGIN: Joi.string().uri().default("http://localhost:3000"),
  MONGODB_URI: Joi.string().required()
});
