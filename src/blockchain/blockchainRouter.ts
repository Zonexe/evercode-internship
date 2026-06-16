import express, { Router } from "express";
import { BlockchainController } from "./blockchainController";

export function createBlockchainRouter({
  blockchainController,
}: {
  blockchainController: BlockchainController;
}): Router {
  const router = express.Router();

  router.get("/height", blockchainController.getHeight);

  return router;
}
