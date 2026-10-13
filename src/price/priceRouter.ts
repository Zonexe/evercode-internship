import express, { Router } from "express";
import { PriceController } from "./priceController";

export function createPriceRouter({
  priceController,
}: {
  priceController: PriceController;
}): Router {
  const router = express.Router();

  router.get("/", priceController.getPrice);
  router.get("/latest", priceController.getLatest);

  return router;
}
