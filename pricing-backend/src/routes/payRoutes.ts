import express, { Router } from "express";
import path from "path";

export function createPayRouter(): Router {
  const router = Router();
  const publicDir = path.join(process.cwd(), "public");
  const payHtml = path.join(publicDir, "pay.html");

  router.get("/pay", (_req, res) => {
    res.sendFile(payHtml);
  });

  router.get("/pay.html", (_req, res) => {
    res.sendFile(payHtml);
  });

  /** Short token path reserved for future workspace lookup; MVP uses query params on pay.html */
  router.get("/pay/:token", (_req, res) => {
    res.sendFile(payHtml);
  });

  router.use("/public", express.static(publicDir));

  return router;
}
