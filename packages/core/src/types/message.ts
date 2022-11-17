export interface MessageBase {
  channel: string;
}

export interface MessageConsumable extends MessageBase {
  consumable: boolean;
  consumed?: boolean;
  id?: string;
}

export enum NotificationType {
  'warn' = 'warn',
  'error' = 'error',
  'info' = 'info',
}

export interface NotificationAction {
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

export interface NotificationActionMessage extends Notification, MessageConsumable {
  channel: 'notification';
  source: string;
  payload: Notification['payload'] & {actions: Array<NotificationAction>};
}
