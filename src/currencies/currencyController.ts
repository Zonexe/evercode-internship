import { Request, Response } from "express";
import {
  ICurrencyRepository,
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from "./currency.types";

export class CurrencyController {
  private readonly currencyRepository: ICurrencyRepository;

  constructor({
    currencyRepository,
  }: {
    currencyRepository: ICurrencyRepository;
  }) {
    this.currencyRepository = currencyRepository;
  }

  public getAll = (req: Request, res: Response): void => {
    const currencies = this.currencyRepository.findAll();
    res.json(currencies);
  };

  public getById = (req: Request<{ id: string }>, res: Response): void => {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Некорректный формат параметра id" });
      return;
    }

    const currency = this.currencyRepository.findById(id);

    if (!currency) {
      res.status(404).json({ error: `Валюта с ID "${id}" не найдена` });
      return;
    }

    res.json(currency);
  };

  public create = (
    req: Request<Record<string, never>, any, CreateCurrencyDto>,
    res: Response,
  ): void => {
    const { name, ticker } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({
        error: "Поле 'name' обязательно и должно быть непустой строкой",
      });
      return;
    }

    if (!ticker || typeof ticker !== "string" || ticker.trim() === "") {
      res.status(400).json({
        error: "Поле 'ticker' обязательно и должно быть непустой строкой",
      });
      return;
    }

    const existingCurrency = this.currencyRepository.findByTicker(ticker);
    if (existingCurrency) {
      res.status(409).json({
        error: `Валюта с тикером "${ticker.toUpperCase()}" уже существует`,
      });
      return;
    }

    const newCurrency = this.currencyRepository.create({
      name: name.trim(),
      ticker: ticker.trim(),
    });

    res.status(201).json(newCurrency);
  };

  public update = (
    req: Request<{ id: string }, any, UpdateCurrencyDto>,
    res: Response,
  ): void => {
    const { id } = req.params;
    const { name, ticker } = req.body;

    const existing = this.currencyRepository.findById(id);
    if (!existing) {
      res.status(404).json({ error: `Валюта с ID "${id}" не найдена` });
      return;
    }

    if (name === undefined && ticker === undefined) {
      res.status(400).json({
        error:
          "Необходимо передать хотя бы одно поле для изменения ('name' или 'ticker')",
      });
      return;
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim() === "")
    ) {
      res
        .status(400)
        .json({ error: "Поле 'name' должно быть непустой строкой" });
      return;
    }

    if (
      ticker !== undefined &&
      (typeof ticker !== "string" || ticker.trim() === "")
    ) {
      res
        .status(400)
        .json({ error: "Поле 'ticker' должно быть непустой строкой" });
      return;
    }

    if (ticker !== undefined) {
      const conflicted = this.currencyRepository.findByTicker(ticker);
      if (conflicted && conflicted.id !== id) {
        res.status(409).json({
          error: `Валюта с тикером "${ticker.toUpperCase()}" уже зарегистрирована под другим ID`,
        });
        return;
      }
    }

    const updated = this.currencyRepository.update(id, {
      name: name?.trim(),
      ticker: ticker?.trim(),
    });

    res.json(updated);
  };

  public remove = (req: Request<{ id: string }>, res: Response): void => {
    const { id } = req.params;

    const isDeleted = this.currencyRepository.delete(id);

    if (!isDeleted) {
      res.status(404).json({ error: `Валюта с ID "${id}" не найдена` });
      return;
    }

    res.status(204).send();
  };
}
