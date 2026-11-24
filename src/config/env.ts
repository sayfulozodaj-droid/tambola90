import dotenv from "dotenv";

dotenv.config();

const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  smsApiKey: process.env.SMS_API_KEY ?? "",
  smsProvider: process.env.SMS_PROVIDER ?? "stub",
  smsGatewayToken: process.env.SMS_GATEWAY_TOKEN ?? "",
  smsGatewayUrl: process.env.SMS_GATEWAY_URL ?? "https://api.sms-gateway.tj/v1/send",
  port: Number(process.env.PORT ?? 3000),
  uploadPath: process.env.UPLOAD_PATH ?? "./uploads",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};

if (!env.databaseUrl) {
  console.warn("[env] DATABASE_URL холӣ аст — сервер кор мекунад, аммо Prisma наметавонад ба база пайваст шавад.");
}

export default env;
