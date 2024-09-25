import { initApp } from "./app/app";
import express, { Express } from "express";
export const startServer = async (app: Express) => {
  const serverApp = initApp({ app });
  const PORT: string = process.env.PORT || "3000";
  serverApp.listen(PORT, () => {
    console.log(`Server Started:${PORT}`);
  });
};
startServer(express());
