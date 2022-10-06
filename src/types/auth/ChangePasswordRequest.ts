import type { ConfirEmailRequest } from './ConfirmEmailRequest';

export type ChangePasswordRequest = ConfirEmailRequest & {
  password: string;
};
