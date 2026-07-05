import { queueEmail, getFailedEmailOutbox, retryFailedEmail } from './emailService.js';
import { HttpError } from './httpError.js';

export const sendAdminTestEmail = async (toInput: unknown) => {
  const to = typeof toInput === 'string' ? toInput.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new HttpError(400, 'Adresse email de test invalide.');
  }

  await queueEmail({
    to,
    template: 'testEmail',
    payload: {}
  });

  return {
    success: true,
    message: 'Email de test mis en file d\'attente.'
  };
};

export const listFailedOutboxEmails = async () => ({
  items: await getFailedEmailOutbox(100)
});

export const resendFailedOutboxEmail = async (id: string) => {
  await retryFailedEmail(id);
  return {
    success: true,
    message: 'Email remis en file d\'attente.'
  };
};
