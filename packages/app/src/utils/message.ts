import type {ConfirmMessage, NotificationMessage} from 'feedengine';

export function isConfirmMessage(message: any): message is ConfirmMessage {
  if (message?.channel === 'confirm') {
    return true;
  }
  return false;
}

export function isNotificationMessage(message: any): message is NotificationMessage {
  if (message?.channel === 'notification') {
    return true;
  }
  return false;
}
