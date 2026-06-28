import webpush from 'web-push';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();
let initialized = false;

function initWebPush() {
  if (initialized) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(sub, pub, priv);
  initialized = true;
  return true;
}

async function sendWebPush(subscription, payload) {
  if (!subscription?.endpoint || !initWebPush()) return;
  try { await webpush.sendNotification(subscription, JSON.stringify(payload)); } catch (_) {}
}

async function sendExpoPush(token, payload) {
  if (!token || !Expo.isExpoPushToken(token)) return;
  try {
    await expo.sendPushNotificationsAsync([{
      to: token, sound: 'default', title: payload.title, body: payload.body, data: payload.data || {},
    }]);
  } catch (_) {}
}

export async function sendNewTicketNotification(subscription, ticket, expoPushToken) {
  const payload = {
    title: 'Novo Chamado 4Biz',
    body: `#${ticket.ticketId}: ${ticket.title}`,
    data: { ticketId: ticket.ticketId, type: 'new_ticket', situacao: ticket.situacao },
  };
  await sendWebPush(subscription, payload);
  await sendExpoPush(expoPushToken, payload);
}

export async function sendStatusChangeNotification(subscription, ticket, expoPushToken) {
  const payload = {
    title: 'Situação Alterada - 4Biz',
    body: `#${ticket.ticketId}: ${ticket.oldSituacao} → ${ticket.situacao}`,
    data: { ticketId: ticket.ticketId, type: 'status_change' },
  };
  await sendWebPush(subscription, payload);
  await sendExpoPush(expoPushToken, payload);
}
