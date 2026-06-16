import crypto from "node:crypto";
import {
  Address,
  CreateAddressDto,
  UpdateAddressDto,
  IAddressRepository,
} from "./address.types";

export class InMemoryAddressRepository implements IAddressRepository {
  private readonly store = new Map<string, Address>();

  public findAll(): Address[] {
    return Array.from(this.store.values()).map((addr) => ({ ...addr }));
  }

  public findById(id: string): Address | undefined {
    const addr = this.store.get(id);
    return addr ? { ...addr } : undefined;
  }

  public findByAddress(address: string): Address | undefined {
    for (const addr of this.store.values()) {
      if (addr.address === address) {
        return { ...addr };
      }
    }
    return undefined;
  }

  public create(dto: CreateAddressDto): Address {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newAddress: Address = {
      id,
      address: dto.address,
      label: dto.label,
      createdAt: now,
      updatedAt: now,
    };

    this.store.set(id, newAddress);
    return { ...newAddress };
  }

  public update(id: string, dto: UpdateAddressDto): Address | undefined {
    const existing = this.store.get(id);
    if (!existing) {
      return undefined;
    }

    const now = new Date().toISOString();
    const updatedAddress: Address = {
      ...existing,
      address: dto.address !== undefined ? dto.address : existing.address,
      label: dto.label !== undefined ? dto.label : existing.label,
      updatedAt: now,
    };

    this.store.set(id, updatedAddress);
    return { ...updatedAddress };
  }

  public delete(id: string): boolean {
    return this.store.delete(id);
  }
}
