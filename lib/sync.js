import connectDB from './mongodb.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import { fetchTicketsFromAPI, organizarDadosTicket } from './4biz/crawler.js';
import { compareTickets } from './parseTickets.js';
import { sendNewTicketNotification, sendStatusChangeNotification } from './push.js';
import { decrypt } from './crypto.js';

export async function syncUserTickets(userId, onProgress) {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new Error('Usuário não encontrado');
  if (!user.fourBizSessionCookie || !user.fourBizAuthToken)
    throw new Error('Configure os cookies da 4Biz em configurações');

  onProgress?.({ percent: 10, message: 'Descriptografando credenciais...' });
  const sessionCookie = await decrypt(user.fourBizSessionCookie);
  const authToken = await decrypt(user.fourBizAuthToken);

  onProgress?.({ percent: 20, message: 'Buscando chamados na 4Biz...' });
  const ticketsAPI = await fetchTicketsFromAPI({ sessionCookie, authToken });
  const newTicketsData = ticketsAPI.map(organizarDadosTicket);

  onProgress?.({ percent: 60, message: `${newTicketsData.length} chamados obtidos. Comparando...` });
  const existingTickets = await Ticket.find({ userId: user._id });
  const comparison = compareTickets(existingTickets, newTicketsData);

  onProgress?.({ percent: 70, message: 'Salvando alterações...' });

  for (const ticketData of comparison.new) {
    const ticket = await Ticket.create({ userId: user._id, ...ticketData });
    if (user.phoneToken?.endpoint || user.expoPushToken)
      await sendNewTicketNotification(user.phoneToken, ticket, user.expoPushToken).catch(() => {});
  }

  for (const ticketData of comparison.updated) {
    await Ticket.findOneAndUpdate(
      { userId: user._id, ticketId: ticketData.ticketId },
      { ...ticketData, updatedAt: new Date() }
    );
    if (user.phoneToken?.endpoint || user.expoPushToken)
      await sendStatusChangeNotification(user.phoneToken, ticketData, user.expoPushToken).catch(() => {});
  }

  for (const ticketData of comparison.unchanged)
    await Ticket.findOneAndUpdate({ userId: user._id, ticketId: ticketData.ticketId }, ticketData);

  for (const ticketData of comparison.removed)
    await Ticket.findOneAndDelete({ userId: user._id, ticketId: ticketData.ticketId });

  onProgress?.({ percent: 100, message: 'Sincronização concluída!' });

  return {
    total: newTicketsData.length,
    new: comparison.new.length,
    updated: comparison.updated.length,
    unchanged: comparison.unchanged.length,
    removed: comparison.removed.length,
  };
}
