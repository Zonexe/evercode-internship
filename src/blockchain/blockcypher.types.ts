export interface BlockchainInfo {
  height: number;
  name: string;
  hash: string;
}

export interface AddressBalance {
  address: string;
  balance: number;
  finalBalance: number;
  totalReceived: number;
  totalSent: number;
}

export interface IBlockcypherService {
  getBlockchainHeight(): Promise<number>;
  getAddressBalance(address: string): Promise<AddressBalance>;
}
