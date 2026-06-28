function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

export function compareTickets(oldTickets, newTickets) {
  const oldMap = new Map(oldTickets.map(t => [t.ticketId.toString(), t]));
  const newMap = new Map(newTickets.map(t => [(t.ticketId || t.numero).toString(), t]));
  const result = { new: [], updated: [], unchanged: [], removed: [] };

  newTickets.forEach(newT => {
    const id = (newT.ticketId || newT.numero).toString();
    const old = oldMap.get(id);
    if (!old) { result.new.push(newT); return; }

    const priorityChanged = old.priority && normalizeValue(old.priority) !== normalizeValue(newT.priority);
    const situacaoChanged = old.situacao && normalizeValue(old.situacao) !== normalizeValue(newT.situacao);

    if (priorityChanged || situacaoChanged) {
      result.updated.push({ ...newT, oldPriority: old.priority, oldSituacao: old.situacao });
    } else {
      result.unchanged.push(newT);
    }
  });

  oldTickets.forEach(old => {
    if (!newMap.has(old.ticketId.toString())) result.removed.push(old);
  });

  return result;
}
