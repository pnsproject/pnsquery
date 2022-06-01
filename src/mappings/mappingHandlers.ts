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

import { BigNumberish, Bytes } from "ethers";
import { NameRegisterWithConfig } from "../types/models/NameRegisterWithConfig";
import { NameRegisterByManager } from "../types/models/NameRegisterByManager";

type NewSubdomainEventArgs = [string, BigNumberish, BigNumberish, string] & {
  to: string;
  tokenId: BigNumberish;
  subtokenId: BigNumberish;
  name: string;
};

type TransferEventArgs = [string, string, BigNumberish] & {
  from: string;
  to: string;
  tokenId: BigNumberish;
};

type CapacityUpdatedEventArgs = [BigNumberish, BigNumberish] & {
  tokenId: BigNumberish;
  capacity: BigNumberish;
};

type PriceChangedEventArgs = [BigNumberish[], BigNumberish[]] & {
  basePrices: BigNumberish[];
  rentPrices: BigNumberish[];
};

type NameRegisteredEventArgs = [
  string,
  BigNumberish,
  BigNumberish,
  BigNumberish,
  string
] & {
  to: string;
  node: BigNumberish;
  cost: BigNumberish;
  expires: BigNumberish;
  name: string;
};

type ApprovalEventArgs = [string, string, BigNumberish] & {
  owner: string;
  approved: string;
  tokenId: BigNumberish;
};

type ApprovalForAllEventArgs = [string, string, boolean] & {
  owner: string;
  operator: string;
  approved: boolean;
};

type NewResolverEventArgs = [BigNumberish, string] & {
  tokenId: BigNumberish;
  resolver: string;
};

export async function handleNewSubdomain(
  event: MoonbeamEvent<NewSubdomainEventArgs>
): Promise<void> {
  let subdomain = await Subdomain.get(event.args.subtokenId.toString());

  let parent_domain = await Subdomain.get(event.args.tokenId.toString());
  let parent_name = "dot";
  if (parent_domain) {
    parent_name = parent_domain.name;
  }

  if (!subdomain) {
    subdomain = new Subdomain(event.args.subtokenId.toString());
    subdomain.name = event.args.name + "." + parent_name;
    subdomain.parent = event.args.tokenId.toString();
    subdomain.owner = event.args.to;
    await subdomain.save();
  }
  let newSubdomain = new NewSubdomain(
    event.blockTimestamp.getTime().toString()
  );
  newSubdomain.name = event.args.name;
  newSubdomain.node = event.args.tokenId.toString();
  newSubdomain.subnode = event.args.subtokenId.toString();
  newSubdomain.to = event.args.to;

  await newSubdomain.save();
}

export async function handleTransfer(
  event: MoonbeamEvent<TransferEventArgs>
): Promise<void> {
  let subdomain = await Subdomain.get(event.args.tokenId.toString());

  if (subdomain) {
    if (event.args.to == "0x0000000000000000000000000000000000000000") {
      await store.remove("Subdomain", event.args.tokenId.toString());
    } else {
      subdomain.owner = event.args.to;
      await subdomain.save();
    }
  }

  let transfer = new Transfer(event.blockTimestamp.getTime().toString());

  transfer.from = event.args.from;
  transfer.node = event.args.tokenId.toString();
  transfer.to = event.args.to;

  await transfer.save();
}

export async function handleCapacityUpdated(
  event: MoonbeamEvent<CapacityUpdatedEventArgs>
): Promise<void> {
  let capacityChanged = new CapacityChanged(
    event.blockTimestamp.getTime().toString()
  );

  capacityChanged.capacity = event.args.capacity.toString();

  capacityChanged.node = event.args.tokenId.toString();

  await capacityChanged.save();
}

export async function handlePriceChanged(
  event: MoonbeamEvent<PriceChangedEventArgs>
): Promise<void> {
  let pricesChanged = new PriceChanged(
    event.blockTimestamp.getTime().toString()
  );

  pricesChanged.basePrices = event.args.basePrices.map((x) => x.toString());
  pricesChanged.rentPrices = event.args.rentPrices.map((x) => x.toString());

  await pricesChanged.save();
}

export async function handleNameRegistered(
  event: MoonbeamEvent<NameRegisteredEventArgs>
): Promise<void> {
  const args = event.args;

  let nameRegistered = new NameRegistered(
    event.blockTimestamp.getTime().toString()
  );

  nameRegistered.cost = args.cost.toString();
  nameRegistered.expires = args.expires.toString();
  nameRegistered.name = args.name;
  nameRegistered.node = args.node.toString();
  nameRegistered.to = args.to;

  await nameRegistered.save();
}

export async function handleApproval(
  event: MoonbeamEvent<ApprovalEventArgs>
): Promise<void> {
  let approval = new Approval(event.blockTimestamp.getTime().toString());

  approval.approved = event.args.approved;
  approval.node = event.args.tokenId.toString();
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

  newResolver.node = event.args.tokenId.toString();
  newResolver.resolver = event.args.resolver;

  await newResolver.save();
}

type NewKeyEventArgs = [BigNumberish, BigNumberish] & {
  keyIndex: BigNumberish;
  key: BigNumberish;
};

type ResetRecordsEventArgs = [BigNumberish] & { tokenId: BigNumberish };

type SetEventArgs = [BigNumberish, BigNumberish, string] & {
  tokenId: BigNumberish;
  keyHash: BigNumberish;
  value: string;
};

type SetNameEventArgs = [string, BigNumberish] & {
  addr: string;
  tokenId: BigNumberish;
};

type SetNftNameEventArgs = [string, BigNumberish, BigNumberish] & {
  nftAddr: string;
  nftTokenId: BigNumberish;
  tokenId: BigNumberish;
};

type ConfigUpdatedEventArgs = [BigNumberish] & { flags: BigNumberish };

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
  configUpdated.flags = event.args.flags.toString();
  await configUpdated.save();
}

export async function handleControllerConfigUpdated(
  event: MoonbeamEvent<ConfigUpdatedEventArgs>
): Promise<void> {
  let configUpdated = new ControllerConfigUpdated(
    event.blockTimestamp.getTime().toString()
  );
  configUpdated.flags = event.args.flags.toString();
  await configUpdated.save();
}

export async function handleNewKey(
  event: MoonbeamEvent<NewKeyEventArgs>
): Promise<void> {
  let newKey = new NewKey(event.blockTimestamp.getTime().toString());

  newKey.key = event.args.key.toString();
  newKey.keyIndex = event.args.keyIndex.toString();

  await newKey.save();
}

export async function handleResetRecords(
  event: MoonbeamEvent<ResetRecordsEventArgs>
): Promise<void> {
  let resetRecords = new ResetRecords(
    event.blockTimestamp.getTime().toString()
  );

  resetRecords.node = event.args.tokenId.toString();

  await resetRecords.save();
}

export async function handleSet(
  event: MoonbeamEvent<SetEventArgs>
): Promise<void> {
  let set = new Set(event.blockTimestamp.getTime().toString());

  set.keyHash = event.args.keyHash.toString();
  set.node = event.args.tokenId.toString();
  set.value = event.args.value;

  await set.save();
}

export async function handleSetName(
  event: MoonbeamEvent<SetNameEventArgs>
): Promise<void> {
  let setName = new SetName(event.blockTimestamp.getTime().toString());

  setName.addr = event.args.addr;
  setName.node = event.args.tokenId.toString();

  await setName.save();
}

export async function handleSetNftName(
  event: MoonbeamEvent<SetNftNameEventArgs>
): Promise<void> {
  let setNftName = new SetNftName(event.blockTimestamp.getTime().toString());

  setNftName.nftAddr = event.args.nftAddr;
  setNftName.nftNode = event.args.nftTokenId.toString();
  setNftName.node = event.args.tokenId.toString();

  await setNftName.save();
}

type MetadataUpdatedEventArgs = [BigNumberish[]] & { data: BigNumberish[] };

export async function handleMetadataUpdated(
  event: MoonbeamEvent<MetadataUpdatedEventArgs>
): Promise<void> {
  let meatadataUpdated = new MetadataUpdated(
    event.blockTimestamp.getTime().toString()
  );

  meatadataUpdated.data = event.args.data.map((x) => x.toString());

  await meatadataUpdated.save();
}

type NameRenewedEventArgs = [
  BigNumberish,
  BigNumberish,
  BigNumberish,
  string
] & {
  node: BigNumberish;
  cost: BigNumberish;
  expires: BigNumberish;
  name: string;
};
export async function handleNameRenewed(
  event: MoonbeamEvent<NameRenewedEventArgs>
): Promise<void> {
  let nameRenewed = new NameRenewed(event.blockTimestamp.getTime().toString());

  nameRenewed.node = event.args.node.toString();
  nameRenewed.cost = event.args.cost.toString();
  nameRenewed.expires = event.args.expires.toString();
  nameRenewed.name = event.args.name;

  await nameRenewed.save();
}

type nameRedeemCallArgs = [
  string,
  string,
  BigNumberish,
  BigNumberish,
  Bytes
] & {
  name: string;
  owner: string;
  duration: BigNumberish;
  deadline: BigNumberish;
  code: Bytes;
};

export async function handleNameRedeem(
  call: MoonbeamCall<nameRedeemCallArgs>
): Promise<void> {
  let nameRedeem = new NameRedeem(call.hash);

  nameRedeem.name = call.args.name;
  nameRedeem.owner = call.args.owner;
  nameRedeem.duration = call.args.duration.toString();
  nameRedeem.deadline = call.args.deadline.toString();
  nameRedeem.code = hex(call.args.code);
  nameRedeem.success = call.success;
  nameRedeem.timestamp = call.timestamp;
  nameRedeem.from = call.from;

  await nameRedeem.save();
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

type nameRegisterCallArgs = [string, string, BigNumberish] & {
  name: string;
  owner: string;
  duration: BigNumberish;
};

export async function handleNameRegister(
  call: MoonbeamCall<nameRegisterCallArgs>
): Promise<void> {
  let nameRegister = new NameRegister(call.hash);

  nameRegister.name = call.args.name;
  nameRegister.owner = call.args.owner;
  nameRegister.duration = call.args.duration.toString();
  nameRegister.success = call.success;
  nameRegister.timestamp = call.timestamp;
  nameRegister.from = call.from;

  await nameRegister.save();
}

type nameRegisterByManagerCallArgs = [
  string,
  string,
  BigNumberish,
  BigNumberish[],
  BigNumberish[]
] & {
  name: string;
  owner: string;
  duration: BigNumberish;
  keyHashes: BigNumberish[];
  values: BigNumberish[];
};

export async function handleNameRegisterByManager(
  call: MoonbeamCall<nameRegisterByManagerCallArgs>
): Promise<void> {
  let nameRegisterByManager = new NameRegisterByManager(call.hash);

  nameRegisterByManager.name = call.args.name;
  nameRegisterByManager.owner = call.args.owner;
  nameRegisterByManager.duration = call.args.duration.toString();
  nameRegisterByManager.keyHashes = call.args.keyHashes.map((x) =>
    x.toString()
  );
  nameRegisterByManager.values = call.args[4].map((x) => x.toString());
  nameRegisterByManager.success = call.success;
  nameRegisterByManager.timestamp = call.timestamp;

  await nameRegisterByManager.save();
}

type nameRegisterWithConfigCallArgs = [
  string,
  string,
  BigNumberish,
  BigNumberish[],
  BigNumberish[]
] & {
  name: string;
  owner: string;
  duration: BigNumberish;
  keyHashes: BigNumberish[];
  values: BigNumberish[];
};

export async function handleNameRegisterWithConfig(
  call: MoonbeamCall<nameRegisterWithConfigCallArgs>
): Promise<void> {
  let nameRegisterWithConfig = new NameRegisterWithConfig(call.hash);

  nameRegisterWithConfig.name = call.args.name;
  nameRegisterWithConfig.owner = call.args.owner;
  nameRegisterWithConfig.duration = call.args.duration.toString();
  nameRegisterWithConfig.keyHashes = call.args.keyHashes.map((x) =>
    x.toString()
  );
  // NOTE: values 和call.args的values方法冲重名了，所以在这里使用args[4]
  nameRegisterWithConfig.values = call.args[4].map((x) => x.toString());
  nameRegisterWithConfig.success = call.success;
  nameRegisterWithConfig.timestamp = call.timestamp;

  await nameRegisterWithConfig.save();
}

type renewCallArgs = [string, BigNumberish] & {
  name: string;
  duration: BigNumberish;
};

export async function handleRenew(
  call: MoonbeamCall<renewCallArgs>
): Promise<void> {
  let renew = new Renew(call.hash);

  renew.name = call.args.name;
  renew.duration = call.args.duration.toString();
  renew.success = call.success;
  renew.timestamp = call.timestamp;
  renew.from = call.from;

  await renew.save();
}

type renewByManagerCallArgs = [string, BigNumberish] & {
  name: string;
  duration: BigNumberish;
};

export async function handleRenewByManager(
  call: MoonbeamCall<renewByManagerCallArgs>
): Promise<void> {
  let renewByManager = new RenewByManager(call.hash);

  renewByManager.name = call.args.name;
  renewByManager.duration = call.args.duration.toString();
  renewByManager.success = call.success;
  renewByManager.timestamp = call.timestamp;
  renewByManager.from = call.from;

  await renewByManager.save();
}
