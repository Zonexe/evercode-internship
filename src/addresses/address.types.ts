export interface Address {
  id: string;
  address: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateAddressDto = Omit<Address, "id" | "createdAt" | "updatedAt">;

export type UpdateAddressDto = Partial<CreateAddressDto>;

export interface IAddressRepository {
  findAll(): Address[];
  findById(id: string): Address | undefined;
  findByAddress(address: string): Address | undefined;
  create(dto: CreateAddressDto): Address;
  update(id: string, dto: UpdateAddressDto): Address | undefined;
  delete(id: string): boolean;
}
