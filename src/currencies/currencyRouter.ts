import express, { Router } from "express";
import { CurrencyController } from "./currencyController";

export function createCurrencyRouter({
  currencyController,
}: {
  currencyController: CurrencyController;
}): Router {
  const router = express.Router();

  router.post("/", currencyController.create);
  router.get("/", currencyController.getAll);
  router.get("/:id", currencyController.getById);
  router.put("/:id", currencyController.update);
  router.delete("/:id", currencyController.remove);

  return router;
}
