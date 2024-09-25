import express, { Router } from "express";
import { aiRoutes } from "../ai/routes";
const router: Router = express.Router();

export const routes = () => {
  router.use("/ai", aiRoutes());

  return router;
};
