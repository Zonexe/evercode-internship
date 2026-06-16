import { Request, Response, NextFunction } from "express";
import {
  IAddressRepository,
  CreateAddressDto,
  UpdateAddressDto,
} from "./address.types";
import { IBlockcypherService } from "../blockchain/blockcypher.types";
import { ILogger } from "../utils/logger";
import { AppError } from "../errors/AppError";

export class AddressController {
  private readonly addressRepository: IAddressRepository;
  private readonly blockcypherService: IBlockcypherService;
  private readonly logger: ILogger;

  constructor({
    addressRepository,
    blockcypherService,
    logger,
  }: {
    addressRepository: IAddressRepository;
    blockcypherService: IBlockcypherService;
    logger: ILogger;
  }) {
    this.addressRepository = addressRepository;
    this.blockcypherService = blockcypherService;
    this.logger = logger;
  }

  public getAll = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const addresses = this.addressRepository.findAll();
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  };

  public getById = (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        throw new AppError("Некорректный формат параметра id", 400);
      }

      const address = this.addressRepository.findById(id);

      if (!address) {
        throw new AppError(`Адрес с ID "${id}" не найден`, 404);
      }

      res.json(address);
    } catch (error) {
      next(error);
    }
  };

  public create = (
    req: Request<Record<string, never>, any, CreateAddressDto>,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      const { address, label } = req.body;

      if (!address || typeof address !== "string" || address.trim() === "") {
        throw new AppError(
          "Поле 'address' обязательно и должно быть непустой строкой",
          400,
        );
      }

      if (!label || typeof label !== "string" || label.trim() === "") {
        throw new AppError(
          "Поле 'label' обязательно и должно быть непустой строкой",
          400,
        );
      }

      const normalizedAddress = address.trim();

      const existingAddress =
        this.addressRepository.findByAddress(normalizedAddress);
      if (existingAddress) {
        throw new AppError(
          `Адрес "${normalizedAddress}" уже отслеживается под ID "${existingAddress.id}"`,
          409,
        );
      }

      const newAddress = this.addressRepository.create({
        address: normalizedAddress,
        label: label.trim(),
      });

      this.logger.info(
        `Добавлен новый отслеживаемый адрес: ${normalizedAddress} (${label.trim()})`,
      );
      res.status(201).json(newAddress);
    } catch (error) {
      next(error);
    }
  };

  public update = (
    req: Request<{ id: string }, any, UpdateAddressDto>,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      const { id } = req.params;
      const { address, label } = req.body;

      const existing = this.addressRepository.findById(id);
      if (!existing) {
        throw new AppError(`Адрес с ID "${id}" не найден`, 404);
      }

      if (address === undefined && label === undefined) {
        throw new AppError(
          "Необходимо передать хотя бы одно поле для изменения ('address' или 'label')",
          400,
        );
      }

      if (
        address !== undefined &&
        (typeof address !== "string" || address.trim() === "")
      ) {
        throw new AppError("Поле 'address' должно быть непустой строкой", 400);
      }

      if (
        label !== undefined &&
        (typeof label !== "string" || label.trim() === "")
      ) {
        throw new AppError("Поле 'label' должно быть непустой строкой", 400);
      }

      const trimmedAddress = address?.trim();

      if (trimmedAddress !== undefined) {
        const conflicted = this.addressRepository.findByAddress(trimmedAddress);
        if (conflicted && conflicted.id !== id) {
          throw new AppError(
            `Адрес "${trimmedAddress}" уже отслеживается под другим ID`,
            409,
          );
        }
      }

      const updated = this.addressRepository.update(id, {
        address: trimmedAddress,
        label: label?.trim(),
      });

      this.logger.info(`Адрес с ID "${id}" успешно обновлен.`);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  public remove = (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      const { id } = req.params;

      const isDeleted = this.addressRepository.delete(id);

      if (!isDeleted) {
        throw new AppError(`Адрес с ID "${id}" не найден`, 404);
      }

      this.logger.info(`Адрес с ID "${id}" успешно удален из отслеживания.`);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public getBalance = async (
    req: Request<{ address: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { address } = req.params;

      if (!address || typeof address !== "string" || address.trim() === "") {
        throw new AppError("Некорректный формат параметра address", 400);
      }

      const normalizedAddress = address.trim();
      this.logger.debug(
        `Запрос живого баланса для адреса: ${normalizedAddress}`,
      );

      const balanceData =
        await this.blockcypherService.getAddressBalance(normalizedAddress);

      res.json(balanceData);
    } catch (error) {
      next(error);
    }
  };
}
