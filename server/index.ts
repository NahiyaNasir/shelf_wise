import "dotenv/config";
import express from "express";

import { auth } from "./app/lib/auth";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";

import cookieParser from "cookie-parser";
import { IndexRoutes } from "./app/route/Route";

const app = express();
const port = Number(process.env.PORT) || 5000;



app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
// app.use("/api/products", productRouter);
app.use(
  cors({
    origin: [
    //   envVars.FRONTEND_URL,
    //   envVars.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});
app.use("/api/v1", IndexRoutes);
app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

export default app;
