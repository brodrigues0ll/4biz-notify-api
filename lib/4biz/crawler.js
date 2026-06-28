import axios from 'axios';

const SITUACAO_MAP = { 1:'Em Andamento',2:'Suspensa',3:'Cancelada',4:'Resolvida',5:'Reaberta',6:'Fechada' };
const PRIORIDADE_MAP = { 1:'Crítica',2:'Alta',3:'Média',4:'Baixa',5:'Baixa' };

function converterSituacao(code) {
  return SITUACAO_MAP[parseInt(code)] || (code ? `Situação ${code}` : '');
}
function converterPrioridade(code) {
  return PRIORIDADE_MAP[parseInt(code)] || (code ? `Prioridade ${code}` : '');
}

export function organizarDadosTicket(ticket) {
  return {
    ticketId: ticket.id?.toString() || '',
    numero: ticket.id?.toString() || '',
    title: ticket.titulo || ticket.tipo || '',
    priority: converterPrioridade(ticket.prioridade),
    status: '',
    dataCriacao: ticket.dataCriacao || '',
    responsavel: ticket.responsavel || '',
    solicitante: ticket.solicitante || '',
    sla: ticket.taskSlaTime || '',
    dataLimite: ticket.dataLimite || '',
    servico: ticket.nomeServico || '',
    descricao: ticket.descricao || '',
    tipo: ticket.tipo,
    situacao: converterSituacao(ticket.situacao),
    situacaoCodigo: ticket.situacao,
    grupo: ticket.nomeGrupoAtual,
    idGrupo: ticket.idGrupoAtual,
    statusFluxo: {
      id: ticket.statusFluxoId,
      nome: ticket.statusFluxoNome,
      descricao: ticket.statusFluxoDescricao,
      corFundo: ticket.statusFluxoCorFundo,
      corTexto: ticket.statusFluxoCorTexto,
    },
  };
}

export async function fetchTicketsFromAPI({ baseUrl, sessionCookie, authToken, itensPorPagina = 50 } = {}) {
  baseUrl = baseUrl || process.env.BASE_URL || 'https://nav.4biz.one/4biz';
  if (!sessionCookie || !authToken) throw new Error('Cookies de autenticação obrigatórios');

  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Cookie: `SESSION=${sessionCookie}; HYPER-AUTH-TOKEN=${authToken}`,
    },
  });

  async function buscarPagina(pagina) {
    const { data } = await client.post(
      '/rest/citajax/ticket/serviceRequestIncident/atualizarLista',
      {
        object: {
          paginaSelecionada: pagina, palavraChave: '', idSolicitacao: null,
          idTipo: -1, idContrato: -1, idGrupoAtual: -1, exibicao: '',
          tipoVisualizacao: '', exibicaoSubSolicitacoes: 'N', situacaoSla: '',
          ordenarPor: 'NSolicitacao', allowCommentOnly: false, itensPorPagina,
          idStatus: null, idStatusFluxo: null, totalRequests: 0, totalize: true,
        },
        realUrl: '/4biz/serviceRequestIncident/serviceRequestIncident.load',
      }
    );
    return data;
  }

  const primeira = await buscarPagina(1);
  if (!primeira?.requests) throw new Error('Resposta da API inválida');

  let tickets = [...primeira.requests];
  for (let p = 2; p <= (primeira.lastPage || 1); p++) {
    const resp = await buscarPagina(p);
    if (resp?.requests) tickets = tickets.concat(resp.requests);
    await new Promise(r => setTimeout(r, 200));
  }
  return tickets;
}
