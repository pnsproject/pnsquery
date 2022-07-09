import { MoonbeamCall, MoonbeamEvent } from "@subql/moonbeam-evm-processor";
import {
  Subdomain,
  PriceChanged,
  CapacityChanged,
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
} from "../types/models";

import { BigNumber, BigNumberish, Bytes } from "ethers";
import { SubdomainType } from "../types";

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
    if (parent_domain.name) {
      parent_name = parent_domain.name;
    }
  }

  logger.info("parent_name: " + parent_name);

  if (!subdomain) {
    subdomain = new Subdomain(event.args.subtokenId.toString());
    subdomain.infos = [];
  }

  subdomain.removed = false;
  subdomain.name = event.args.name + "." + parent_name;
  subdomain.parent = event.args.tokenId.toString();
  subdomain.owner = event.args.to;
  await subdomain.save();
}

export async function handleTransfer(
  event: MoonbeamEvent<TransferEventArgs>
): Promise<void> {
  let subdomain = await Subdomain.get(event.args.tokenId.toString());

  if (!subdomain) {
    subdomain = new Subdomain(event.args.tokenId.toString());
    subdomain.infos = [];
  }

  if (event.args.to == "0x0000000000000000000000000000000000000000") {
    subdomain.removed = true;
  }
  subdomain.owner = event.args.to;
  let flag = false;

  subdomain.infos.forEach((info) => {
    if (info.tx_hash === event.transactionHash) {
      info.from = event.args.from;
      info.owner = event.args.to;
      info.timestamp = event.blockTimestamp.getTime();
      flag = true;
    }
  });

  if (!flag) {
    subdomain.infos.push({
      tx_hash: event.transactionHash,
      from: event.args.from,
      owner: event.args.to,
      timestamp: event.blockTimestamp.getTime(),
      type: SubdomainType.Transfer,
    });
  }

  await subdomain.save();
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

  let subdomain = await Subdomain.get(args.node.toString());

  if (!subdomain) {
    subdomain = new Subdomain(event.args.node.toString());
    subdomain.infos = [];
  }

  subdomain.owner = args.to;
  subdomain.expires = args.expires.toString();
  let flag = false;
  subdomain.infos.forEach((info) => {
    if (info.tx_hash === event.transactionHash) {
      info.owner = args.to;
      info.timestamp = event.blockTimestamp.getTime();
      info.duration = BigNumber.from(args.expires)
        .sub(event.blockTimestamp.getTime())
        .toString();
      info.cost = args.cost.toString();
      flag = true;
    }
  });

  if (!flag) {
    let nameRegistered = {
      tx_hash: event.transactionHash,
      owner: event.args.to,
      timestamp: event.blockTimestamp.getTime(),
      type: null,
      duration: BigNumber.from(args.expires)
        .sub(event.blockTimestamp.getTime())
        .toString(),
      cost: args.cost.toString(),
    };

    if (BigNumber.from(args.cost).eq(0)) {
      nameRegistered.type = SubdomainType.RegisterByManager;
    } else {
      nameRegistered.type = SubdomainType.Register;
    }

    subdomain.infos.push(nameRegistered);
  }

  await subdomain.save();
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

type NewKeyEventArgs = [BigNumberish, string, string] & {
  tokenId: BigNumberish;
  keyIndex: string;
  key: string;
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
  let newKey = new NewKey(event.args.tokenId.toString());

  newKey.key = event.args.key;
  newKey.keyIndex = event.args.keyIndex;
  newKey.timestamp = event.blockTimestamp.getTime();

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
  let subdomain = await Subdomain.get(event.args.node.toString());
  if (!subdomain) {
    subdomain = new Subdomain(event.args.node.toString());
    subdomain.infos = [];
  }
  subdomain.expires = event.args.expires.toString();

  let flag = false;

  subdomain.infos.forEach((info) => {
    if (info.tx_hash === event.transactionHash) {
      info.cost = event.args.cost.toString();
      info.duration = BigNumber.from(event.args.expires)
        .sub(event.blockTimestamp.getTime())
        .toString();
      info.type = SubdomainType.Renew;
      info.timestamp = event.blockTimestamp.getTime();
      flag = true;
    }
  });

  if (!flag) {
    let nameRenewed = {
      tx_hash: event.transactionHash,
      cost: event.args.cost.toString(),
      duration: BigNumber.from(event.args.expires)
        .sub(event.blockTimestamp.getTime())
        .toString(),
      type: SubdomainType.Renew,
      timestamp: event.blockTimestamp.getTime(),
    };

    subdomain.infos.push(nameRenewed);
  }

  await subdomain.save();
}

type nameRedeemCallArgs = [
  string,
  string,
  BigNumberish,
  BigNumberish,
  Bytes
] & {
  name: string;
  to: string;
  duration: BigNumberish;
  deadline: BigNumberish;
  code: Bytes;
};

export async function handleNameRedeem(
  call: MoonbeamCall<nameRedeemCallArgs>
): Promise<void> {
  let namehash = getNamehash(suffixTld(call.args.name));

  let token = BigNumber.from(namehash).toString();

  logger.info(token);

  let subdomain = await Subdomain.get(token);

  if (!subdomain) {
    subdomain = new Subdomain(token);
    subdomain.infos = [];
  }

  if (call.success) {
    if (call.timestamp) {
      subdomain.expires = BigNumber.from(call.args.duration)
        .add(call.timestamp)
        .toString();
    }
  }

  let flag = false;

  subdomain.infos.forEach((x) => {
    if (x.tx_hash === call.hash) {
      x.type = SubdomainType.Redeem;
      x.success = call.success;
      x.timestamp = call.timestamp;
      flag = true;
    }
  });

  if (!flag) {
    let nameRedeem = {
      success: call.success,
      timestamp: call.timestamp,
      type: SubdomainType.Redeem,
    };
    subdomain.infos.push(nameRedeem);
  }

  await subdomain.save();
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

type nameRegisterByManagerCallArgs = [
  string,
  string,
  BigNumberish,
  BigNumberish,
  BigNumberish[],
  BigNumberish[]
] & {
  name: string;
  to: string;
  duration: BigNumberish;
  data: BigNumberish;
  keyHashes: BigNumberish[];
  values: BigNumberish[];
};

export async function handleNameRegisterByManager(
  call: MoonbeamCall<nameRegisterByManagerCallArgs>
): Promise<void> {
  let token = BigNumber.from(getNamehash(suffixTld(call.args.name))).toString();
  let subdomain = await Subdomain.get(token);

  if (!subdomain) {
    subdomain = new Subdomain(token);
    subdomain.infos = [];
  }
  if (call.success) {
    if (call.timestamp) {
      subdomain.expires = BigNumber.from(call.args.duration)
        .add(call.timestamp)
        .toString();
    }
  }

  let flag = false;

  subdomain.infos.forEach((x) => {
    if (x.tx_hash === call.hash) {
      x.type = SubdomainType.Register;
      x.success = call.success;
      x.timestamp = call.timestamp;
      flag = true;
    }
  });

  if (!flag) {
    let nameRegister = {
      success: call.success,
      timestamp: call.timestamp,
      type: SubdomainType.Register,
    };
    subdomain.infos.push(nameRegister);
  }

  await subdomain.save();
}

type renewByManagerCallArgs = [string, BigNumberish] & {
  name: string;
  duration: BigNumberish;
};

export async function handleRenewByManager(
  call: MoonbeamCall<renewByManagerCallArgs>
): Promise<void> {
  let token = BigNumber.from(getNamehash(suffixTld(call.args.name))).toString();
  let subdomain = await Subdomain.get(token);

  if (!subdomain) {
    subdomain = new Subdomain(token);
    subdomain.infos = [];
  }
  if (call.success) {
    if (call.timestamp) {
      subdomain.expires = BigNumber.from(call.args.duration)
        .add(call.timestamp)
        .toString();
    }
  }

  let flag = false;

  subdomain.infos.forEach((x) => {
    if (x.tx_hash === call.hash) {
      x.type = SubdomainType.RenewByManager;
      x.success = call.success;
      x.timestamp = call.timestamp;
      x.duration = call.args.duration.toString();
      x.from = call.from;
      flag = true;
    }
  });

  if (!flag) {
    let nameRenewByManager = {
      success: call.success,
      timestamp: call.timestamp,
      type: SubdomainType.RenewByManager,
      duration: call.args.duration.toString(),
      from: call.from,
    };
    subdomain.infos.push(nameRenewByManager);
  }

  await subdomain.save();
}

import { keccak_256 } from "js-sha3";

function getNamehash(name: string): string {
  let node = "0000000000000000000000000000000000000000000000000000000000000000";

  if (name) {
    let labels = name.split(".");
    logger.info("labels: " + labels);
    for (let i = labels.length - 1; i >= 0; i--) {
      let labelSha = keccak_256(labels[i]);
      logger.info(node + labelSha);
      let msg = Buffer.from(node + labelSha, "hex").toString("hex");
      logger.info("msg: " + msg);
      node = keccak_256(msg);
      logger.info("node: " + node);
    }
  }

  logger.info(node);

  return "0x" + node;
}

export function suffixTld(label: string): string {
  return label.replace(".dot", "") + ".dot";
}
