export interface MessageBase {
  channel: string;
}

export interface MessageConsumable extends MessageBase {
  consumable: boolean;
}

export interface MessageConsumed extends MessageBase {
  id: string;
}
