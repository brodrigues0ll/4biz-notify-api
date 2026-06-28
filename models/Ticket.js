import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: String, required: true },
  title: { type: String, required: true },
  status: String,
  priority: String,
  situacao: String,
  situacaoCodigo: Number,
  tipo: String,
  grupo: String,
  idGrupo: Number,
  sla: String,
  solicitante: String,
  responsavel: String,
  servico: String,
  dataLimite: String,
  dataCriacao: String,
  descricao: String,
  numero: String,
  statusFluxo: mongoose.Schema.Types.Mixed,
  raw: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TicketSchema.index({ userId: 1, ticketId: 1 }, { unique: true });

export default mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
