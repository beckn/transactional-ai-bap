import express, { Router } from "express";
import { aiRoutes } from "../ai/routes";
import { nonBecknRoutes } from "../non-beckn/routes";
const router: Router = express.Router();

export const routes = () => {
  router.use("/ai", aiRoutes());
  router.use("/non-beckn", nonBecknRoutes());
  return router;
};
