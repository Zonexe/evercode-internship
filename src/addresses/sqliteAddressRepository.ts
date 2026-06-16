import { DatabaseSync, StatementSync } from "node:sqlite";
import crypto from "node:crypto";
import {
  Address,
  CreateAddressDto,
  UpdateAddressDto,
  IAddressRepository,
} from "./address.types";

export class SqliteAddressRepository implements IAddressRepository {
  private readonly db: DatabaseSync;

  private readonly findAllStmt: StatementSync;
  private readonly findByIdStmt: StatementSync;
  private readonly findByAddressStmt: StatementSync;
  private readonly createStmt: StatementSync;
  private readonly updateStmt: StatementSync;
  private readonly deleteStmt: StatementSync;

  constructor({ database }: { database: DatabaseSync }) {
    this.db = database;

    this.findAllStmt = this.db.prepare("SELECT * FROM addresses");
    this.findByIdStmt = this.db.prepare("SELECT * FROM addresses WHERE id = ?");

    this.findByAddressStmt = this.db.prepare(
      "SELECT * FROM addresses WHERE address = ?",
    );

    this.createStmt = this.db.prepare(
      "INSERT INTO addresses (id, address, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    this.updateStmt = this.db.prepare(
      "UPDATE addresses SET address = ?, label = ?, updated_at = ? WHERE id = ?",
    );
    this.deleteStmt = this.db.prepare("DELETE FROM addresses WHERE id = ?");
  }

  private mapRow(row: any): Address {
    return {
      id: row.id,
      address: row.address,
      label: row.label,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public findAll(): Address[] {
    const rows = this.findAllStmt.all();
    return rows.map((row) => this.mapRow(row));
  }

  public findById(id: string): Address | undefined {
    const row = this.findByIdStmt.get(id);
    return row ? this.mapRow(row) : undefined;
  }

  public findByAddress(address: string): Address | undefined {
    const row = this.findByAddressStmt.get(address);
    return row ? ((row as any) ? this.mapRow(row) : undefined) : undefined;
  }

  public create(dto: CreateAddressDto): Address {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.createStmt.run(id, dto.address, dto.label, now, now);

    return {
      id,
      address: dto.address,
      label: dto.label,
      createdAt: now,
      updatedAt: now,
    };
  }

  public update(id: string, dto: UpdateAddressDto): Address | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    const updatedAddress =
      dto.address !== undefined ? dto.address : existing.address;
    const updatedLabel = dto.label !== undefined ? dto.label : existing.label;
    const now = new Date().toISOString();

    this.updateStmt.run(updatedAddress, updatedLabel, now, id);

    return {
      id,
      address: updatedAddress,
      label: updatedLabel,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  public delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return Number(result.changes) > 0;
  }
}
