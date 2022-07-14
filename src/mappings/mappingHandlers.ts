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
  SubdomainInfo,
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

  if (!subdomain) {
    subdomain = new Subdomain(event.args.subtokenId.toString());
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
  }

  if (event.args.to == "0x0000000000000000000000000000000000000000") {
    subdomain.removed = true;
  }
  subdomain.owner = event.args.to;

  await subdomain.save();

  let infos = await SubdomainInfo.getByCurrentId(subdomain.id);

  let flag = true;
  if (infos) {
    let info = infos.find((info) => {
      info.id === event.transactionHash;
    });
    if (info) {
      info.from = event.args.from;
      info.owner = event.args.to;
      info.timestamp = BigNumber.from(
        event.blockTimestamp.getUTCSeconds()
      ).toBigInt();
      await info.save();
      flag = false;
    }
  }

  if (flag) {
    let info = SubdomainInfo.create({
      id: event.transactionHash,
      from: event.args.from,
      owner: event.args.to,
      timestamp: BigNumber.from(
        event.blockTimestamp.getUTCSeconds()
      ).toBigInt(),
      type: SubdomainType.Transfer,
      currentId: subdomain.id,
    });

    await info.save();
  }
}

export async function handleCapacityUpdated(
  event: MoonbeamEvent<CapacityUpdatedEventArgs>
): Promise<void> {
  let capacityChanged = new CapacityChanged(
    event.blockTimestamp.getUTCSeconds().toString()
  );

  capacityChanged.capacity = event.args.capacity.toString();

  capacityChanged.node = event.args.tokenId.toString();

  await capacityChanged.save();
}

export async function handlePriceChanged(
  event: MoonbeamEvent<PriceChangedEventArgs>
): Promise<void> {
  let pricesChanged = new PriceChanged(
    event.blockTimestamp.getUTCSeconds().toString()
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
  }

  subdomain.owner = args.to;
  subdomain.expires = BigNumber.from(args.expires).toBigInt();

  await subdomain.save();

  let infos = await SubdomainInfo.getByCurrentId(subdomain.id);

  let info = infos.find((info) => {
    info.id === event.transactionHash;
  });
  if (info) {
    info.owner = args.to;
    info.timestamp = BigNumber.from(
      event.blockTimestamp.getUTCSeconds()
    ).toBigInt();
    info.duration = BigNumber.from(args.expires)
      .sub(event.blockTimestamp.getUTCSeconds())
      .toBigInt();
    info.cost = args.cost.toString();
    await info.save();
  } else {
    let nameRegistered = {
      currentId: subdomain.id,
      id: event.transactionHash,
      owner: event.args.to,
      timestamp: BigNumber.from(
        event.blockTimestamp.getUTCSeconds()
      ).toBigInt(),
      type: null,
      duration: BigNumber.from(args.expires)
        .sub(event.blockTimestamp.getUTCSeconds())
        .toBigInt(),
      cost: args.cost.toString(),
    };
    if (BigNumber.from(args.cost).eq(0)) {
      nameRegistered.type = SubdomainType.RegisterByManager;
    } else {
      nameRegistered.type = SubdomainType.Register;
    }

    let info = SubdomainInfo.create(nameRegistered);

    await info.save();
  }
}

export async function handleApproval(
  event: MoonbeamEvent<ApprovalEventArgs>
): Promise<void> {
  let approval = new Approval(event.blockTimestamp.getUTCSeconds().toString());

  approval.approved = event.args.approved;
  approval.node = event.args.tokenId.toString();
  approval.owner = event.args.owner;

  await approval.save();
}

export async function handleApprovalForAll(
  event: MoonbeamEvent<ApprovalForAllEventArgs>
): Promise<void> {
  let approvalForAll = new ApprovalForAll(
    event.blockTimestamp.getUTCSeconds().toString()
  );

  approvalForAll.approved = event.args.approved;
  approvalForAll.operator = event.args.operator;
  approvalForAll.owner = event.args.owner;

  await approvalForAll.save();
}

export async function handleNewResolver(
  event: MoonbeamEvent<NewResolverEventArgs>
): Promise<void> {
  let newResolver = new NewResolver(
    event.blockTimestamp.getUTCSeconds().toString()
  );

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
    event.blockTimestamp.getUTCSeconds().toString()
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
    event.blockTimestamp.getUTCSeconds().toString()
  );
  entity.oldRoot = event.args.oldRoot;
  entity.newRoot = event.args.newRoot;
  await entity.save();
}

export async function handlePnsConfigUpdated(
  event: MoonbeamEvent<ConfigUpdatedEventArgs>
): Promise<void> {
  let configUpdated = new PnsConfigUpdated(
    event.blockTimestamp.getUTCSeconds().toString()
  );
  configUpdated.flags = event.args.flags.toString();
  await configUpdated.save();
}

export async function handleControllerConfigUpdated(
  event: MoonbeamEvent<ConfigUpdatedEventArgs>
): Promise<void> {
  let configUpdated = new ControllerConfigUpdated(
    event.blockTimestamp.getUTCSeconds().toString()
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
  newKey.timestamp = event.blockTimestamp.getUTCSeconds();

  await newKey.save();
}

export async function handleResetRecords(
  event: MoonbeamEvent<ResetRecordsEventArgs>
): Promise<void> {
  let resetRecords = new ResetRecords(
    event.blockTimestamp.getUTCSeconds().toString()
  );

  resetRecords.node = event.args.tokenId.toString();

  await resetRecords.save();
}

export async function handleSet(
  event: MoonbeamEvent<SetEventArgs>
): Promise<void> {
  let set = new Set(event.blockTimestamp.getUTCSeconds().toString());

  set.keyHash = event.args.keyHash.toString();
  set.node = event.args.tokenId.toString();
  set.value = event.args.value;

  await set.save();
}

export async function handleSetName(
  event: MoonbeamEvent<SetNameEventArgs>
): Promise<void> {
  let setName = new SetName(event.blockTimestamp.getUTCSeconds().toString());

  setName.addr = event.args.addr;
  setName.node = event.args.tokenId.toString();

  await setName.save();
}

export async function handleSetNftName(
  event: MoonbeamEvent<SetNftNameEventArgs>
): Promise<void> {
  let setNftName = new SetNftName(
    event.blockTimestamp.getUTCSeconds().toString()
  );

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
    event.blockTimestamp.getUTCSeconds().toString()
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
  }
  subdomain.expires = BigNumber.from(event.args.expires).toBigInt();
  await subdomain.save();

  let infos = await SubdomainInfo.getByCurrentId(subdomain.id);

  let info = infos.find((info) => {
    info.id === event.transactionHash;
  });

  if (info) {
    info.cost = event.args.cost.toString();
    info.duration = BigNumber.from(event.args.expires)
      .sub(event.blockTimestamp.getUTCSeconds())
      .toBigInt();
    info.type = SubdomainType.Renew;
    info.timestamp = BigNumber.from(
      event.blockTimestamp.getUTCSeconds()
    ).toBigInt();
    await info.save();
  } else {
    let nameRenewed = {
      currentId: subdomain.id,
      id: event.transactionHash,
      cost: event.args.cost.toString(),
      duration: BigNumber.from(event.args.expires)
        .sub(event.blockTimestamp.getUTCSeconds())
        .toBigInt(),
      type: SubdomainType.Renew,
      timestamp: BigNumber.from(
        event.blockTimestamp.getUTCSeconds()
      ).toBigInt(),
    };

    let info = SubdomainInfo.create(nameRenewed);
    await info.save();
  }
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

  let subdomain = await Subdomain.get(token);
  if (!subdomain) {
    subdomain = new Subdomain(token);
  }

  if (call.success) {
    if (call.timestamp) {
      subdomain.expires = BigNumber.from(call.args.duration)
        .add(call.timestamp)
        .toBigInt();
    }
  }

  await subdomain.save();

  let infos = await SubdomainInfo.getByCurrentId(subdomain.id);

  let info = infos.find((x) => {
    x.id === call.hash;
  });

  if (info) {
    info.type = SubdomainType.Redeem;
    info.success = call.success;
    info.timestamp = BigNumber.from(call.timestamp).toBigInt();
    await info.save();
  } else {
    let nameRedeem = {
      currentId: subdomain.id,
      id: call.hash,
      success: call.success,
      timestamp: BigNumber.from(call.timestamp).toBigInt(),
      type: SubdomainType.Redeem,
    };
    let info = SubdomainInfo.create(nameRedeem);
    await info.save();
  }
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
  }
  if (call.success) {
    if (call.timestamp) {
      subdomain.expires = BigNumber.from(call.args.duration)
        .add(call.timestamp)
        .toBigInt();
    }
  }

  await subdomain.save();

  let infos = await SubdomainInfo.getByCurrentId(subdomain.id);

  let info = infos.find((x) => {
    x.id === call.hash;
  });

  if (info) {
    info.type = SubdomainType.Register;
    info.success = call.success;
    info.timestamp = BigNumber.from(call.timestamp).toBigInt();
    await info.save();
  } else {
    let nameRegister = {
      currentId: subdomain.id,
      id: call.hash,
      success: call.success,
      timestamp: BigNumber.from(call.timestamp).toBigInt(),
      type: SubdomainType.Register,
    };
    let info = SubdomainInfo.create(nameRegister);
    await info.save();
  }
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
    await subdomain.save();
  }
  if (call.success) {
    if (call.timestamp) {
      subdomain.expires = BigNumber.from(call.args.duration)
        .add(call.timestamp)
        .toBigInt();
    }
  }

  let infos = await SubdomainInfo.getByCurrentId(subdomain.id);

  let info = infos.find((x) => {
    x.id === call.hash;
  });

  if (info) {
    info.type = SubdomainType.RenewByManager;
    info.success = call.success;
    info.timestamp = BigNumber.from(call.timestamp).toBigInt();
    info.duration = BigNumber.from(call.args.duration).toBigInt();
    await info.save();
  } else {
    let nameRenewByManager = {
      currentId: subdomain.id,
      id: call.hash,
      success: call.success,
      timestamp: BigNumber.from(call.timestamp).toBigInt(),
      type: SubdomainType.RenewByManager,
      duration: BigNumber.from(call.args.duration).toBigInt(),
    };
    let info = SubdomainInfo.create(nameRenewByManager);
    await info.save();
  }

  await subdomain.save();
}

import { keccak_256, Message } from "js-sha3";

// TODO: get namehash 计算结果与链上的计算方式不一致
function getNamehash(name: string): string {
  let node = "0000000000000000000000000000000000000000000000000000000000000000";

  if (name) {
    let labels = name.split(".");

    for (let i = labels.length - 1; i >= 0; i--) {
      let labelSha = keccak_256(labels[i]);
      node = keccak_256(
        Array.prototype.slice.call(Buffer.from(node + labelSha, "hex"), 0)
      );
    }
  }

  return "0x" + node;
}

export function suffixTld(label: string): string {
  return label.replace(".dot", "") + ".dot";
}
