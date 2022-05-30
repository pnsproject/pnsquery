import {
  MoonbeamCall,
  MoonbeamEvent,
} from "@subql/contract-processors/dist/moonbeam";
import {
  Subdomain,
  PriceChanged,
  NameRegistered,
  CapacityChanged,
  NewSubdomain,
  Transfer,
  Approval,
  ApprovalForAll,
  NewResolver,
  NewKey,
  Set,
  SetName,
  SetNftName,
  ResetRecords,
  PnsConfigUpdated,
  ManagerChanged,
  RootOwnershipTransferred,
  ControllerConfigUpdated,
  MetadataUpdated,
  NameRenewed,
  NameRedeem,
  Renew,
  RenewByManager,
  NameRegister,
} from "../types/models";

import { BigNumber, Bytes } from "ethers";

type NewSubdomainEventArgs = [string, BigNumber, BigNumber, string] & {
  to: string;
  tokenId: BigNumber;
  subtokenId: BigNumber;
  name: string;
};

type TransferEventArgs = [string, string, BigNumber] & {
  from: string;
  to: string;
  tokenId: BigNumber;
};

type CapacityUpdatedEventArgs = [BigNumber, BigNumber] & {
  tokenId: BigNumber;
  capacity: BigNumber;
};

type PriceChangedEventArgs = [BigNumber[], BigNumber[]] & {
  basePrices: BigNumber[];
  rentPrices: BigNumber[];
};

type NameRegisteredEventArgs = [
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  string
] & {
  to: string;
  node: BigNumber;
  cost: BigNumber;
  expires: BigNumber;
  name: string;
};

type ApprovalEventArgs = [string, string, BigNumber] & {
  owner: string;
  approved: string;
  tokenId: BigNumber;
};

type ApprovalForAllEventArgs = [string, string, boolean] & {
  owner: string;
  operator: string;
  approved: boolean;
};

type NewResolverEventArgs = [BigNumber, string] & {
  tokenId: BigNumber;
  resolver: string;
};

export async function handleNewSubdomain(
  event: MoonbeamEvent<NewSubdomainEventArgs>
): Promise<void> {
  let nodeId = event.args.subtokenId;
  let parentId = event.args.tokenId;
  let subdomain = await Subdomain.get(nodeId.toString());

  let parent_domain = await Subdomain.get(parentId.toString());
  let parent_name = "dot";
  if (parent_domain) {
    parent_name = parent_domain.name;
  }

  if (!subdomain) {
    subdomain = new Subdomain(nodeId.toString());
    subdomain.name = event.args.name + "." + parent_name;
    subdomain.parent = parentId.toBigInt();
    subdomain.owner = event.args.to;
    await subdomain.save();
  }
  let newSubdomain = new NewSubdomain(
    event.blockTimestamp.getTime().toString()
  );
  newSubdomain.name = event.args.name;
  newSubdomain.node = event.args.tokenId.toBigInt();
  newSubdomain.subnode = event.args.subtokenId.toBigInt();
  newSubdomain.to = event.args.to;

  await subdomain.save();
}

export async function handleTransfer(
  event: MoonbeamEvent<TransferEventArgs>
): Promise<void> {
  let nodeId = event.args.tokenId;

  let subdomain = await Subdomain.get(nodeId.toString());

  if (subdomain) {
    if (event.args.to == "0x0000000000000000000000000000000000000000") {
      await store.remove("Subdomain", nodeId.toString());
    } else {
      subdomain.owner = event.args.to;
      await subdomain.save();
    }
  }

  let transfer = new Transfer(event.blockTimestamp.getTime().toString());

  transfer.from = event.args.from;
  transfer.node = event.args.tokenId.toBigInt();
  transfer.to = event.args.to;

  await transfer.save();
}

export async function handleCapacityUpdated(
  event: MoonbeamEvent<CapacityUpdatedEventArgs>
): Promise<void> {
  const args = event.args;

  let nodeId = args.tokenId;

  let capacityChanged = new CapacityChanged(
    event.blockTimestamp.getTime().toString()
  );

  capacityChanged.capacity = args.capacity.toBigInt();

  capacityChanged.node = nodeId.toString();

  await capacityChanged.save();
}

export async function handlePriceChanged(
  event: MoonbeamEvent<PriceChangedEventArgs>
): Promise<void> {
  const args = event.args;

  const basePrices = args.basePrices;
  const rentPrices = args.rentPrices;

  let pricesChanged = new PriceChanged(
    event.blockTimestamp.getTime().toString()
  );

  pricesChanged.basePrices = basePrices.map((x) => x.toBigInt());
  pricesChanged.rentPrices = rentPrices.map((x) => x.toBigInt());

  await pricesChanged.save();
}

export async function handleNameRegistered(
  event: MoonbeamEvent<NameRegisteredEventArgs>
): Promise<void> {
  const args = event.args;

  let nameRegistered = new NameRegistered(
    event.blockTimestamp.getTime().toString()
  );

  nameRegistered.cost = args.cost.toBigInt();
  nameRegistered.expires = args.expires.toBigInt();
  nameRegistered.name = args.name;
  nameRegistered.node = args.node.toBigInt();
  nameRegistered.to = args.to;

  await nameRegistered.save();
}

export async function handleApproval(
  event: MoonbeamEvent<ApprovalEventArgs>
): Promise<void> {
  let approval = new Approval(event.blockTimestamp.getTime().toString());

  approval.approved = event.args.approved;
  approval.node = event.args.tokenId.toBigInt();
  approval.owner = event.args.owner;

  await approval.save();
}

export async function handleApprovalForAll(
  event: MoonbeamEvent<ApprovalForAllEventArgs>
): Promise<void> {
  let approvalForAll = new ApprovalForAll(
    event.blockTimestamp.getTime().toString()
  );

  approvalForAll.approved = event.args.approved;
  approvalForAll.operator = event.args.operator;
  approvalForAll.owner = event.args.owner;

  await approvalForAll.save();
}

export async function handleNewResolver(
  event: MoonbeamEvent<NewResolverEventArgs>
): Promise<void> {
  let newResolver = new NewResolver(event.blockTimestamp.getTime().toString());

  newResolver.node = event.args.tokenId.toBigInt();
  newResolver.resolver = event.args.resolver;

  await newResolver.save();
}

type NewKeyEventArgs = [string, string] & { keyIndex: string; key: string };

type ResetRecordsEventArgs = [BigNumber] & { tokenId: BigNumber };

type SetEventArgs = [BigNumber, BigNumber, string] & {
  tokenId: BigNumber;
  keyHash: BigNumber;
  value: string;
};

type SetNameEventArgs = [string, BigNumber] & {
  addr: string;
  tokenId: BigNumber;
};

type SetNftNameEventArgs = [string, BigNumber, BigNumber] & {
  nftAddr: string;
  nftTokenId: BigNumber;
  tokenId: BigNumber;
};

type ConfigUpdatedEventArgs = [BigNumber] & { flags: BigNumber };

type ManagerChangedEventArgs = [string, boolean] & {
  manager: string;
  role: boolean;
};
export async function handleManagerChanged(
  event: MoonbeamEvent<ManagerChangedEventArgs>
): Promise<void> {
  let managerChanged = new ManagerChanged(
    event.blockTimestamp.getTime().toString()
  );
  managerChanged.manager = event.args.manager;
  managerChanged.role = event.args.role;
  await managerChanged.save();
}
type RootOwnershipTransferredEventArgs = [string, string] & {
  oldRoot: string;
  newRoot: string;
};
export async function handleRootOwnershipTransferred(
  event: MoonbeamEvent<RootOwnershipTransferredEventArgs>
): Promise<void> {
  let entity = new RootOwnershipTransferred(
    event.blockTimestamp.getTime().toString()
  );
  entity.oldRoot = event.args.oldRoot;
  entity.newRoot = event.args.newRoot;
  await entity.save();
}

export async function handlePnsConfigUpdated(
  event: MoonbeamEvent<ConfigUpdatedEventArgs>
): Promise<void> {
  let configUpdated = new PnsConfigUpdated(
    event.blockTimestamp.getTime().toString()
  );
  configUpdated.flags = event.args.flags.toBigInt();
  await configUpdated.save();
}

export async function handleControllerConfigUpdated(
  event: MoonbeamEvent<ConfigUpdatedEventArgs>
): Promise<void> {
  let configUpdated = new ControllerConfigUpdated(
    event.blockTimestamp.getTime().toString()
  );
  configUpdated.flags = event.args.flags.toBigInt();
  await configUpdated.save();
}

export async function handleNewKey(
  event: MoonbeamEvent<NewKeyEventArgs>
): Promise<void> {
  let newKey = new NewKey(event.blockTimestamp.getTime().toString());

  newKey.key = event.args.key;
  newKey.keyIndex = event.args.keyIndex;

  await newKey.save();
}

export async function handleResetRecords(
  event: MoonbeamEvent<ResetRecordsEventArgs>
): Promise<void> {
  let resetRecords = new ResetRecords(
    event.blockTimestamp.getTime().toString()
  );

  resetRecords.node = event.args.tokenId.toBigInt();

  await resetRecords.save();
}

export async function handleSet(
  event: MoonbeamEvent<SetEventArgs>
): Promise<void> {
  let set = new Set(event.blockTimestamp.getTime().toString());

  set.keyHash = event.args.keyHash.toBigInt();
  set.node = event.args.tokenId.toBigInt();
  set.value = event.args.value;

  await set.save();
}

export async function handleSetName(
  event: MoonbeamEvent<SetNameEventArgs>
): Promise<void> {
  let setName = new SetName(event.blockTimestamp.getTime().toString());

  setName.addr = event.args.addr;
  setName.node = event.args.tokenId.toBigInt();

  await setName.save();
}

export async function handleSetNftName(
  event: MoonbeamEvent<SetNftNameEventArgs>
): Promise<void> {
  let setNftName = new SetNftName(event.blockTimestamp.getTime().toString());

  setNftName.nftAddr = event.args.nftAddr;
  setNftName.nftNode = event.args.nftTokenId.toBigInt();
  setNftName.node = event.args.tokenId.toBigInt();

  await setNftName.save();
}

type MetadataUpdatedEventArgs = [BigNumber[]] & { data: BigNumber[] };

export async function handleMetadataUpdated(
  event: MoonbeamEvent<MetadataUpdatedEventArgs>
): Promise<void> {
  let meatadataUpdated = new MetadataUpdated(
    event.blockTimestamp.getTime().toString()
  );

  meatadataUpdated.data = event.args.data.map((x) => x.toBigInt());

  await meatadataUpdated.save();
}

type NameRenewedEventArgs = [BigNumber, BigNumber, BigNumber, string] & {
  node: BigNumber;
  cost: BigNumber;
  expires: BigNumber;
  name: string;
};
export async function handleNameRenewed(
  event: MoonbeamEvent<NameRenewedEventArgs>
): Promise<void> {
  let nameRenewed = new NameRenewed(event.blockTimestamp.getTime().toString());

  nameRenewed.node = event.args.node.toBigInt();
  nameRenewed.cost = event.args.cost.toBigInt();
  nameRenewed.expires = event.args.expires.toBigInt();
  nameRenewed.name = event.args.name;

  await nameRenewed.save();
}

type nameRedeemCallArgs = [string, string, BigNumber, BigNumber, Bytes] & {
  name: string;
  owner: string;
  duration: BigNumber;
  deadline: BigNumber;
  code: Bytes;
};

export async function handleNameRedeem(
  call: MoonbeamCall<nameRedeemCallArgs>
): Promise<void> {
  let nameRenewed = new NameRedeem(call.hash);

  nameRenewed.name = call.args.name;
  nameRenewed.owner = call.args.owner;
  nameRenewed.duration = call.args.duration.toBigInt();
  nameRenewed.deadline = call.args.deadline.toBigInt();
  nameRenewed.code = hex(call.args.code);
  nameRenewed.success = call.success;
  nameRenewed.timestamp = call.timestamp;
  nameRenewed.from = call.from;

  await nameRenewed.save();
}
const HexCharacters: string = "0123456789abcdef";

function hex(bytes: Bytes): string {
  let result = "0x";
  for (let i = 0; i < bytes.length; i++) {
    let v = bytes[i];
    result += HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f];
  }
  return result;
}

type nameRegisterCallArgs = [string, string, BigNumber] & {
  name: string;
  owner: string;
  duration: BigNumber;
};

export async function handleNameRegister(
  call: MoonbeamCall<nameRegisterCallArgs>
): Promise<void> {
  let nameRegister = new NameRegister(call.hash);

  nameRegister.name = call.args.name;
  nameRegister.owner = call.args.owner;
  nameRegister.duration = call.args.duration.toBigInt();
  nameRegister.success = call.success;
  nameRegister.timestamp = call.timestamp;
  nameRegister.from = call.from;

  await nameRegister.save();
}

// type nameRegisterByManagerCallArgs = [
//   string,
//   string,
//   BigNumber,
//   BigNumber[],
//   string[]
// ] & {
//   name: string;
//   owner: string;
//   duration: BigNumber;
//   keyHashes: BigNumber[];
//   values: string[];
// };

// export async function handleNameRegisterByManager(
//   call: MoonbeamCall<nameRegisterByManagerCallArgs>
// ): Promise<void> {
//   let nameRegisterByManager = new NameRegisterByManager(call.hash);

//   nameRegisterByManager.name = call.args.name;
//   nameRegisterByManager.owner = call.args.owner;
//   nameRegisterByManager.duration = call.args.duration.toBigInt();
//   nameRegisterByManager.keyHashes = call.args.keyHashes.map((x) =>
//     x.toBigInt()
//   );
//   nameRegisterByManager.values = call.args.values;
//   nameRegisterByManager.success = call.success;
//   nameRegisterByManager.timestamp = call.timestamp;

//   await nameRegisterByManager.save();
// }

// type nameRegisterWithConfigCallArgs = [
//   string,
//   string,
//   BigNumber,
//   BigNumber[],
//   string[]
// ] & {
//   name: string;
//   owner: string;
//   duration: BigNumber;
//   keyHashes: BigNumber[];
//   values: string[];
// };

// export async function handleNameRegisterWithConfig(
//   call: MoonbeamCall<nameRegisterWithConfigCallArgs>
// ): Promise<void> {
//   let nameRegisterWithConfig = new NameRegisterWithConfig(call.hash);

//   nameRegisterWithConfig.name = call.args.name;
//   nameRegisterWithConfig.owner = call.args.owner;
//   nameRegisterWithConfig.duration = call.args.duration.toBigInt();
//   nameRegisterWithConfig.keyHashes = call.args.keyHashes.map((x) =>
//     x.toBigInt()
//   );
//   nameRegisterWithConfig.values = call.args.values;
//   nameRegisterWithConfig.success = call.success;
//   nameRegisterWithConfig.timestamp = call.timestamp;

//   await nameRegisterWithConfig.save();
// }

type renewCallArgs = [string, BigNumber] & {
  name: string;
  duration: BigNumber;
};

export async function handleRenew(
  call: MoonbeamCall<renewCallArgs>
): Promise<void> {
  let renew = new Renew(call.hash);

  renew.name = call.args.name;
  renew.duration = call.args.duration.toBigInt();
  renew.success = call.success;
  renew.timestamp = call.timestamp;
  renew.from = call.from;

  await renew.save();
}

type renewByManagerCallArgs = [string, BigNumber] & {
  name: string;
  duration: BigNumber;
};

export async function handleRenewByManager(
  call: MoonbeamCall<renewByManagerCallArgs>
): Promise<void> {
  let renewByManager = new RenewByManager(call.hash);

  renewByManager.name = call.args.name;
  renewByManager.duration = call.args.duration.toBigInt();
  renewByManager.success = call.success;
  renewByManager.timestamp = call.timestamp;
  renewByManager.from = call.from;

  await renewByManager.save();
}
