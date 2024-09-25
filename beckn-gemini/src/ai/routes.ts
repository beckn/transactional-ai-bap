import express, { Router } from "express";
import { webhookController } from "./controller";

const router: Router = express.Router();

export const aiRoutes = () => {
  router.post("/webhook", webhookController);

  return router;
};
