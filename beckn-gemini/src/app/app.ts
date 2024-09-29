import express, { Express, Router, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { routes } from "./routes";
import { generateQRCode } from "../utils/qr-code-utils";
import path from "path";
interface InitAppParams {
  app: Express;
}

const initApp = ({ app }: InitAppParams) => {
  const router: Router = express.Router();
  dotenv.config();

  app.options(
    "*",
    cors<Request>({
      origin: "*",
      optionsSuccessStatus: 200,
      credentials: true,
      methods: ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"]
    })
  );

  console.log(path.join(__dirname, "../../public"));
  app.use("/static", express.static(path.join(__dirname, "../../public")));

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"]
    })
  );

  app.use(express.urlencoded({ extended: true, limit: "200mb" }));
  app.use(express.json({ limit: "200mb" }));
  app.use(router);

  router.use("/ping", (req: Request, res: Response) => {
    res.json({
      status: 200,
      message: "Ping successfully"
    });
  });

  router.use("/api", routes());

  return app;
};

export { initApp };
