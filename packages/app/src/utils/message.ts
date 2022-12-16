import type {ConfirmMessage, NotificationMessage} from 'feedengine';

export function isConfirmMessage(
  message: ConfirmMessage | NotificationMessage | null
): message is ConfirmMessage {
  if (message?.channel === 'confirm') {
    return true;
  }
  return false;
}
