import express, { Router } from "express";
import { AddressController } from "./addressController";

export function createAddressRouter({
  addressController,
}: {
  addressController: AddressController;
}): Router {
  const router = express.Router();

  router.post("/", addressController.create);
  router.get("/", addressController.getAll);
  router.get("/:id", addressController.getById);
  router.put("/:id", addressController.update);
  router.delete("/:id", addressController.remove);
  router.get("/:address/balance", addressController.getBalance);

  return router;
}
