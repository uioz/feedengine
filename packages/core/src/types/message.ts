import type {NotificationType} from '../message/index.js';
import type {PluginState} from './plugin.js';
import type {TaskState} from './task.js';

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
  type: keyof typeof NotificationType;
  message: string;
}

export interface NotificationMessage extends Notification, MessageBase {
  channel: 'notification';
  source: string;
}

export interface ConfirmMessage extends Notification, MessageConsumable {
  channel: 'confirm';
  source: string;
  actions: Array<ConfimAction>;
}

export interface ProgressMessage extends MessageBase {
  progress?: number;
  message?: string;
}

export interface PluginProgress extends ProgressMessage {
  source: string;
  channel: 'PluginProgress';
  state: PluginState;
}

export interface TaskProgress extends ProgressMessage {
  source: number;
  scheduleId: number;
  channel: 'TaskProgress';
  state: TaskState;
}

export interface ProgressHandler<T extends ProgressMessage> {
  send: (data: Partial<Omit<T, 'channel' | 'source'>>) => this;
  end: () => void;
}
