import type {NotificationType} from '../message/index.js';
import type {PluginState} from './plugin.js';

export interface MessageBase {
  channel: string;
}

export interface MessageConsumable extends MessageBase {
  consumable: boolean;
  consumed?: boolean;
  id?: string;
}

export interface ConfimAction {
  label: string;
  type: 'link' | 'api';
  payload: string;
}

export interface Notification {
  payload: {
    type: NotificationType;
    message: string;
  };
}

export interface NotificationMessage extends Notification, MessageBase {
  channel: 'notification';
  source: string;
}

export interface ConfirmMessage extends Notification, MessageConsumable {
  channel: 'notification';
  source: string;
  payload: Notification['payload'] & {actions: Array<ConfimAction>};
}

export interface ProgressMessage extends MessageBase {
  source: string;
  progress?: number;
  message?: string;
}

export interface PluginProgress extends ProgressMessage {
  channel: 'PluginProgress';
  state: PluginState;
}

export interface ProgressHandler<T extends ProgressMessage> {
  send: (data: Omit<T, 'channel' | 'source'>) => this;
  end: () => void;
}
