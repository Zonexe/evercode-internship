import { Request, Response, NextFunction } from "express";
import { IBlockcypherService } from "./blockcypher.types";
import { ILogger } from "../utils/logger";

export class BlockchainController {
  private readonly blockcypherService: IBlockcypherService;
  private readonly logger: ILogger;

  constructor({
    blockcypherService,
    logger,
  }: {
    blockcypherService: IBlockcypherService;
    logger: ILogger;
  }) {
    this.blockcypherService = blockcypherService;
    this.logger = logger;
  }

  public getHeight = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.logger.debug("Запрос высоты блокчейна Биткоина...");

      const height = await this.blockcypherService.getBlockchainHeight();

      res.json({ height });
    } catch (error) {
      next(error);
    }
  };
}
