import express, { Router } from "express";
import { energySoldController } from "./controller";

const router: Router = express.Router();

export const nonBecknRoutes = () => {
  router.post("/energy-sold", energySoldController);
  return router;
};