/**
 * Tiny i18n: the Spanish text is the key, so the code reads the same and a
 * missing translation falls back to Spanish instead of breaking the UI.
 * Changing language re-mounts the app (see App.tsx), so components can call
 * `t()` directly without hooks.
 */
import { useSyncExternalStore } from 'react'

export type Lang = 'es' | 'en' | 'pt'
export const LANGS: Lang[] = ['es', 'en', 'pt']
const KEY = 'lumensplit.lang'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved && LANGS.includes(saved)) return saved
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'es').toLowerCase()
  if (nav.startsWith('pt')) return 'pt'
  if (nav.startsWith('es')) return 'es'
  return 'en'
}

let current: Lang = detect()
const listeners = new Set<() => void>()
if (typeof document !== 'undefined') document.documentElement.lang = current

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang) {
  if (lang === current) return
  current = lang
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lang
  listeners.forEach((l) => l())
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

/** Locale for dates and numbers. */
export function locale(): string {
  return { es: 'es-ES', en: 'en-GB', pt: 'pt-PT' }[current]
}

type Vars = Record<string, string | number>

export function t(es: string, vars?: Vars): string {
  const text = current === 'es' ? es : (DICT[es]?.[current] ?? es)
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text
}

// ── Translations (key = Spanish). Portuguese is European Portuguese. ─────────

const DICT: Record<string, { en: string; pt: string }> = {
  // Shell
  'Desconectar': { en: 'Disconnect', pt: 'Desligar' },
  'Mi cuenta': { en: 'My account', pt: 'A minha conta' },
  'Sin cookies ni rastreo · Stellar testnet': {
    en: 'No cookies, no tracking · Stellar testnet',
    pt: 'Sem cookies nem rastreio · Stellar testnet',
  },
  'Idioma': { en: 'Language', pt: 'Idioma' },
  'Volver': { en: 'Back', pt: 'Voltar' },
  'Autores': { en: 'Authors', pt: 'Autores' },
  'Sin cookies ni rastreo': { en: 'No cookies, no tracking', pt: 'Sem cookies nem rastreio' },
  'Código abierto bajo licencia MIT': { en: 'Open source under the MIT License', pt: 'Código aberto sob a licença MIT' },
  'Preguntas frecuentes': { en: 'FAQ', pt: 'Perguntas frequentes' },

  // Home
  'Divide gastos con amigos.': { en: 'Split bills with friends.', pt: 'Divida despesas com amigos.' },
  'Salda cuentas en segundos.': { en: 'Settle up in seconds.', pt: 'Acerte contas em segundos.' },
  'Una forma nueva de compartir gastos, construida sobre la blockchain de Stellar: pagos que llegan en segundos a cualquier país, comisiones de menos de un céntimo y un registro compartido que nadie puede alterar.': {
    en: 'A new way to share expenses, built on the Stellar blockchain: payments that arrive in seconds anywhere in the world, fees of less than a cent, and a shared record nobody can tamper with.',
    pt: 'Uma nova forma de partilhar despesas, construída sobre a blockchain Stellar: pagamentos que chegam em segundos a qualquer país, comissões de menos de um cêntimo e um registo partilhado que ninguém pode alterar.',
  },
  'Activando tu cuenta de pruebas…': { en: 'Activating your test account…', pt: 'A ativar a sua conta de testes…' },
  'Conectar Freighter': { en: 'Connect Freighter', pt: 'Ligar Freighter' },
  '¿No tienes Freighter?': { en: "Don't have Freighter?", pt: 'Não tem o Freighter?' },
  'Instálalo aquí': { en: 'Install it here', pt: 'Instale-o aqui' },
  'y cambia a Testnet.': { en: 'and switch to Testnet.', pt: 'e mude para Testnet.' },
  'Mis grupos': { en: 'My groups', pt: 'Os meus grupos' },
  '+ Nuevo grupo': { en: '+ New group', pt: '+ Novo grupo' },
  'Aún no tienes grupos.': { en: "You don't have any groups yet.", pt: 'Ainda não tem grupos.' },
  'Crea uno para empezar a dividir gastos.': {
    en: 'Create one to start splitting expenses.',
    pt: 'Crie um para começar a dividir despesas.',
  },
  '{n} miembros · grupo #{id}': { en: '{n} members · group #{id}', pt: '{n} membros · grupo #{id}' },

  // New group
  'Nuevo grupo': { en: 'New group', pt: 'Novo grupo' },
  'Nombre del grupo': { en: 'Group name', pt: 'Nome do grupo' },
  'Viaje a Lisboa': { en: 'Lisbon trip', pt: 'Viagem a Lisboa' },
  '¿Quiénes participáis?': { en: "Who's in?", pt: 'Quem participa?' },
  'Tú': { en: 'You', pt: 'Você' },
  'tú': { en: 'you', pt: 'você' },
  'TÚ': { en: 'YOU', pt: 'VOCÊ' },
  'creador': { en: 'creator', pt: 'criador' },
  'Nombre del participante': { en: 'Participant name', pt: 'Nome do participante' },
  'Quitar': { en: 'Remove', pt: 'Remover' },
  'Dirección G… (opcional, si no, se une con el enlace)': {
    en: 'G… address (optional, otherwise they join with the link)',
    pt: 'Endereço G… (opcional; se não, entra com a ligação)',
  },
  'Dirección Stellar (opcional)': { en: 'Stellar address (optional)', pt: 'Endereço Stellar (opcional)' },
  '+ Añadir participante': { en: '+ Add participant', pt: '+ Adicionar participante' },
  'Ponle nombre a cada participante.': { en: 'Give every participant a name.', pt: 'Dê um nome a cada participante.' },
  'Hay nombres repetidos.': { en: 'Some names are repeated.', pt: 'Há nomes repetidos.' },
  'Alguna dirección no es una cuenta Stellar válida (G…).': {
    en: 'An address is not a valid Stellar account (G…).',
    pt: 'Algum endereço não é uma conta Stellar válida (G…).',
  },
  'Hay direcciones repetidas (o has puesto la tuya).': {
    en: 'Some addresses are repeated (or you added your own).',
    pt: 'Há endereços repetidos (ou pôs o seu).',
  },
  'Al crear el grupo te daremos un enlace y un QR. Cada amigo lo abre, elige su nombre de esta lista y entra.': {
    en: 'When you create the group you get a link and a QR code. Each friend opens it, picks their name from this list and joins.',
    pt: 'Ao criar o grupo recebe uma ligação e um QR. Cada amigo abre-o, escolhe o seu nome desta lista e entra.',
  },
  'Grupo creado': { en: 'Group created', pt: 'Grupo criado' },
  'Compartiendo tu nombre con el grupo (firma en Freighter, opcional)…': {
    en: 'Sharing your name with the group (Freighter signature, optional)…',
    pt: 'A partilhar o seu nome com o grupo (assinatura no Freighter, opcional)…',
  },
  'Crear grupo': { en: 'Create group', pt: 'Criar grupo' },

  // Group detail
  'No se pudo cargar el grupo': { en: 'Could not load the group', pt: 'Não foi possível carregar o grupo' },
  '+ Invitar': { en: '+ Invite', pt: '+ Convidar' },
  'Tu saldo': { en: 'Your balance', pt: 'O seu saldo' },
  'Estás en paz': { en: "You're all square", pt: 'Está tudo certo' },
  'Te deben dinero': { en: "You're owed money", pt: 'Devem-lhe dinheiro' },
  'Debes dinero': { en: 'You owe money', pt: 'Deve dinheiro' },
  'No debes nada': { en: "You don't owe anything", pt: 'Não deve nada' },
  'Gasto total': { en: 'Total spent', pt: 'Despesa total' },
  '+ Añadir gasto': { en: '+ Add expense', pt: '+ Adicionar despesa' },
  'Saldar cuentas': { en: 'Settle up', pt: 'Acertar contas' },
  'Todo saldado': { en: 'All settled', pt: 'Tudo acertado' },
  'Saldos': { en: 'Balances', pt: 'Saldos' },
  'Invitar amigos': { en: 'Invite friends', pt: 'Convidar amigos' },
  'Estás solo en el grupo. Invita a tus amigos con un enlace o QR →': {
    en: "You're alone in this group. Invite your friends with a link or QR →",
    pt: 'Está sozinho no grupo. Convide os seus amigos com uma ligação ou QR →',
  },
  'Gastos': { en: 'Expenses', pt: 'Despesas' },
  'Todavía no hay gastos.': { en: 'No expenses yet.', pt: 'Ainda não há despesas.' },
  'Pagó': { en: 'Paid by', pt: 'Pagou' },
  'personas': { en: 'people', pt: 'pessoas' },

  // Add expense
  'Añadir gasto': { en: 'Add expense', pt: 'Adicionar despesa' },
  'Descripción': { en: 'Description', pt: 'Descrição' },
  'Cena, taxi, entradas…': { en: 'Dinner, taxi, tickets…', pt: 'Jantar, táxi, bilhetes…' },
  'Tipo de reparto': { en: 'Split type', pt: 'Tipo de divisão' },
  'A partes iguales': { en: 'Split equally', pt: 'Em partes iguais' },
  'Importes distintos': { en: 'Different amounts', pt: 'Valores diferentes' },
  'Importe': { en: 'Amount', pt: 'Valor' },
  'Importe no válido (máx. 7 decimales).': {
    en: 'Invalid amount (max. 7 decimals).',
    pt: 'Valor inválido (máx. 7 casas decimais).',
  },
  'Total': { en: 'Total', pt: 'Total' },
  'Pagado por': { en: 'Paid by', pt: 'Pago por' },
  'Se reparte entre': { en: 'Split between', pt: 'Divide-se entre' },
  '¿Cuánto pone cada uno?': { en: 'How much does each person pay?', pt: 'Quanto paga cada um?' },
  'Ninguno': { en: 'None', pt: 'Nenhum' },
  'Todos': { en: 'All', pt: 'Todos' },
  'Importe de esta persona': { en: "This person's amount", pt: 'Valor desta pessoa' },
  'Pon un importe mayor que 0 a cada persona marcada.': {
    en: 'Enter an amount above 0 for every selected person.',
    pt: 'Indique um valor maior que 0 para cada pessoa selecionada.',
  },
  'Gasto añadido': { en: 'Expense added', pt: 'Despesa adicionada' },
  'Guardar gasto': { en: 'Save expense', pt: 'Guardar despesa' },

  // Settle
  'Los mínimos pagos para que en {group} todos queden en paz. Paga los tuyos con un toque: el dinero llega al momento por Stellar.': {
    en: 'The fewest payments to get everyone in {group} square. Pay yours with one tap: the money arrives instantly over Stellar.',
    pt: 'O mínimo de pagamentos para que em {group} fique tudo certo. Pague os seus com um toque: o dinheiro chega no momento pela Stellar.',
  },
  'Pagaste': { en: 'You paid', pt: 'Pagou' },
  'a': { en: 'to', pt: 'a' },
  'en euros · ': { en: 'in euros · ', pt: 'em euros · ' },
  'confirmado en': { en: 'confirmed in', pt: 'confirmado em' },
  'conversión ↗': { en: 'conversion ↗', pt: 'conversão ↗' },
  'Conversión ↗': { en: 'Conversion ↗', pt: 'Conversão ↗' },
  '¡Todo saldado!': { en: 'All settled!', pt: 'Tudo acertado!' },
  'Nadie debe nada en este grupo.': { en: 'Nobody owes anything in this group.', pt: 'Ninguém deve nada neste grupo.' },
  '1 persona': { en: '1 person', pt: '1 pessoa' },
  '{n} personas': { en: '{n} people', pt: '{n} pessoas' },
  'Debes en total': { en: 'You owe in total', pt: 'Deve no total' },
  'a {people}': { en: 'to {people}', pt: 'a {people}' },
  'Saldar todo ({amount} a {people})': { en: 'Settle all ({amount} to {people})', pt: 'Acertar tudo ({amount} a {people})' },
  'Una sola firma en Freighter: todos los pagos van juntos.': {
    en: 'One Freighter signature: all payments go together.',
    pt: 'Uma só assinatura no Freighter: todos os pagamentos vão juntos.',
  },
  'Todo pagado': { en: 'All paid', pt: 'Tudo pago' },
  '1 pago': { en: '1 payment', pt: '1 pagamento' },
  '{n} pagos': { en: '{n} payments', pt: '{n} pagamentos' },
  'en una sola transacción ·': { en: 'in a single transaction ·', pt: 'numa só transação ·' },
  'Pagaste a': { en: 'You paid', pt: 'Pagou a' },
  'Ver en stellar.expert ↗': { en: 'View on stellar.expert ↗', pt: 'Ver em stellar.expert ↗' },
  'Los euros ya están convertidos a {sym} en tu cuenta: pulsa "Pagar" para terminar.': {
    en: 'Your euros are already converted to {sym} in your account: press "Pay" to finish.',
    pt: 'Os euros já estão convertidos em {sym} na sua conta: carregue em "Pagar" para terminar.',
  },
  'pagas a': { en: 'pay', pt: 'paga a' },
  'paga a': { en: 'pays', pt: 'paga a' },
  'Pagar': { en: 'Pay', pt: 'Pagar' },
  'Pagar en euros': { en: 'Pay in euros', pt: 'Pagar em euros' },
  'tienes {amount}': { en: 'you have {amount}', pt: 'tem {amount}' },
  'Calculando precio en euros…': { en: 'Getting the price in euros…', pt: 'A calcular o preço em euros…' },
  'Pago enviado': { en: 'Payment sent', pt: 'Pagamento enviado' },
  '1/2 Convirtiendo euros…': { en: '1/2 Converting euros…', pt: '1/2 A converter euros…' },
  '2/2 Pagando a {to}…': { en: '2/2 Paying {to}…', pt: '2/2 A pagar a {to}…' },
  'Pagado en euros.': { en: 'Paid in euros.', pt: 'Pago em euros.' },
  'Pago a {to} ↗': { en: 'Payment to {to} ↗', pt: 'Pagamento a {to} ↗' },

  // Join
  'Este enlace no tiene código de invitación. Pide a tu amigo que te lo vuelva a enviar.': {
    en: 'This link has no invite code. Ask your friend to send it again.',
    pt: 'Esta ligação não tem código de convite. Peça ao seu amigo que a envie novamente.',
  },
  'No encontramos este grupo.': { en: "We couldn't find this group.", pt: 'Não encontrámos este grupo.' },
  'Te han invitado a': { en: "You've been invited to", pt: 'Foi convidado para' },
  '1 persona ya divide gastos aquí.': { en: '1 person already splits expenses here.', pt: '1 pessoa já divide despesas aqui.' },
  '{n} personas ya dividen gastos aquí.': {
    en: '{n} people already split expenses here.',
    pt: '{n} pessoas já dividem despesas aqui.',
  },
  'Al unirte empiezas con saldo 0.': { en: 'You start with a balance of 0.', pt: 'Ao entrar começa com saldo 0.' },
  'Ya eres miembro de este grupo.': { en: "You're already a member of this group.", pt: 'Já é membro deste grupo.' },
  'Ir al grupo': { en: 'Go to group', pt: 'Ir para o grupo' },
  '¿Quién eres?': { en: 'Who are you?', pt: 'Quem é você?' },
  'Otro nombre': { en: 'Another name', pt: 'Outro nome' },
  'Escribir mi nombre': { en: 'Type my name', pt: 'Escrever o meu nome' },
  'Tu nombre': { en: 'Your name', pt: 'O seu nome' },
  'Tu cuenta': { en: 'Your account', pt: 'A sua conta' },
  'Unirme como {name}': { en: 'Join as {name}', pt: 'Entrar como {name}' },
  'Elige tu nombre': { en: 'Choose your name', pt: 'Escolha o seu nome' },
  '2 firmas en Freighter: compartir tu nombre con el grupo y unirte.': {
    en: '2 Freighter signatures: share your name with the group and join.',
    pt: '2 assinaturas no Freighter: partilhar o seu nome com o grupo e entrar.',
  },
  '1 firma en Freighter para unirte.': { en: '1 Freighter signature to join.', pt: '1 assinatura no Freighter para entrar.' },
  '¡Ya estás dentro!': { en: "You're in!", pt: 'Já está dentro!' },
  ' (tu nombre solo se ve en este dispositivo)': {
    en: ' (your name is only visible on this device)',
    pt: ' (o seu nome só é visível neste dispositivo)',
  },
  '1/2 Compartiendo tu nombre…': { en: '1/2 Sharing your name…', pt: '1/2 A partilhar o seu nome…' },
  'Uniéndote al grupo…': { en: 'Joining the group…', pt: 'A entrar no grupo…' },

  // Name setup
  '¿Cómo te llamas?': { en: "What's your name?", pt: 'Como se chama?' },
  'Es el nombre que verán tus amigos en lugar de tu dirección. Se guarda en este dispositivo y lo compartimos con tus grupos cuando creas uno o te unes.': {
    en: 'It is the name your friends will see instead of your address. It is saved on this device and shared with your groups when you create or join one.',
    pt: 'É o nome que os seus amigos verão em vez do seu endereço. Fica guardado neste dispositivo e partilhamo-lo com os seus grupos quando cria um ou entra.',
  },
  'Continuar': { en: 'Continue', pt: 'Continuar' },
  'Ahora no': { en: 'Not now', pt: 'Agora não' },

  // Invite modal
  'Quien abra el enlace elige su nombre y entra en {group} con su Freighter.': {
    en: 'Whoever opens the link picks their name and joins {group} with their Freighter.',
    pt: 'Quem abrir a ligação escolhe o seu nome e entra em {group} com o seu Freighter.',
  },
  'Cerrar': { en: 'Close', pt: 'Fechar' },
  'Faltan por unirse': { en: 'Still to join', pt: 'Falta entrar' },
  'Nadie. Añade nombres o comparte el enlace tal cual.': {
    en: 'Nobody. Add names or share the link as it is.',
    pt: 'Ninguém. Adicione nomes ou partilhe a ligação tal como está.',
  },
  'Quitar {name}': { en: 'Remove {name}', pt: 'Remover {name}' },
  'Añadir nombre': { en: 'Add name', pt: 'Adicionar nome' },
  'Añadir': { en: 'Add', pt: 'Adicionar' },
  '¡Copiado!': { en: 'Copied!', pt: 'Copiado!' },
  'Copiar': { en: 'Copy', pt: 'Copiar' },
  'Únete a {group} en LumenSplit': { en: 'Join {group} on LumenSplit', pt: 'Junte-se a {group} no LumenSplit' },
  'Compartir…': { en: 'Share…', pt: 'Partilhar…' },
  'El enlace vale para todo el grupo. Si generas uno nuevo, el anterior deja de funcionar.': {
    en: 'The link works for the whole group. If you create a new one, the old one stops working.',
    pt: 'A ligação serve para todo o grupo. Se gerar uma nova, a anterior deixa de funcionar.',
  },
  'Generar otro': { en: 'Create another', pt: 'Gerar outra' },
  'Crear enlace de invitación': { en: 'Create invite link', pt: 'Criar ligação de convite' },

  // UI kit
  'Guardado solo en este dispositivo.': { en: 'Saved on this device only.', pt: 'Guardado apenas neste dispositivo.' },
  'Firma…': { en: 'Sign…', pt: 'Assine…' },
  'Guardar': { en: 'Save', pt: 'Guardar' },
  'Sin nombre': { en: 'No name', pt: 'Sem nome' },
  'Cambiar mi nombre': { en: 'Change my name', pt: 'Mudar o meu nome' },
  'Confirma en Freighter…': { en: 'Confirm in Freighter…', pt: 'Confirme no Freighter…' },
  'Enviando por Stellar…': { en: 'Sending over Stellar…', pt: 'A enviar pela Stellar…' },
  'Hecho': { en: 'Done', pt: 'Feito' },

  // Errors
  'Ese grupo no existe.': { en: 'That group does not exist.', pt: 'Esse grupo não existe.' },
  'Alguna de las direcciones no es miembro del grupo.': {
    en: 'One of the addresses is not a member of the group.',
    pt: 'Algum dos endereços não é membro do grupo.',
  },
  'El importe tiene que ser mayor que 0.': { en: 'The amount must be greater than 0.', pt: 'O valor tem de ser maior que 0.' },
  'Elige al menos una persona con quien repartir.': {
    en: 'Choose at least one person to split with.',
    pt: 'Escolha pelo menos uma pessoa com quem dividir.',
  },
  'El grupo necesita al menos un miembro.': { en: 'The group needs at least one member.', pt: 'O grupo precisa de pelo menos um membro.' },
  'Hay una dirección repetida entre los miembros.': {
    en: 'An address is repeated among the members.',
    pt: 'Há um endereço repetido entre os membros.',
  },
  'No hay deuda pendiente entre esas dos personas.': {
    en: 'There is no pending debt between those two people.',
    pt: 'Não há dívida pendente entre essas duas pessoas.',
  },
  'El importe es mayor que lo que se debe.': { en: 'The amount is more than what is owed.', pt: 'O valor é maior do que o que se deve.' },
  'No puedes pagarte a ti mismo.': { en: "You can't pay yourself.", pt: 'Não pode pagar a si próprio.' },
  'El enlace de invitación no es válido o ya ha caducado.': {
    en: 'The invite link is not valid or has expired.',
    pt: 'A ligação de convite não é válida ou já expirou.',
  },
  'Este grupo todavía no tiene ninguna invitación activa.': {
    en: 'This group has no active invite yet.',
    pt: 'Este grupo ainda não tem nenhum convite ativo.',
  },
  'Error del contrato #{code}': { en: 'Contract error #{code}', pt: 'Erro do contrato #{code}' },
  'Has cancelado la firma en Freighter.': { en: 'You cancelled the signature in Freighter.', pt: 'Cancelou a assinatura no Freighter.' },
  'No encontramos Freighter. Instala la extensión y recarga la página.': {
    en: "We can't find Freighter. Install the extension and reload the page.",
    pt: 'Não encontrámos o Freighter. Instale a extensão e recarregue a página.',
  },
  'Tu cuenta aún no existe en testnet. Fóndeala gratis con Friendbot y vuelve a intentarlo.': {
    en: "Your account doesn't exist on testnet yet. Fund it for free with Friendbot and try again.",
    pt: 'A sua conta ainda não existe na testnet. Carregue-a grátis com o Friendbot e tente novamente.',
  },
  'No tienes saldo suficiente en la cuenta para este pago.': {
    en: "You don't have enough balance for this payment.",
    pt: 'Não tem saldo suficiente na conta para este pagamento.',
  },
  'Problema de conexión con la red Stellar. Inténtalo de nuevo.': {
    en: 'Connection problem with the Stellar network. Please try again.',
    pt: 'Problema de ligação à rede Stellar. Tente novamente.',
  },
  'Algo ha fallado. Inténtalo de nuevo.': { en: 'Something went wrong. Please try again.', pt: 'Algo correu mal. Tente novamente.' },
  'Conecta tu wallet primero.': { en: 'Connect your wallet first.', pt: 'Ligue primeiro a sua carteira.' },
  'Freighter ha rechazado la conexión.': { en: 'Freighter rejected the connection.', pt: 'O Freighter recusou a ligação.' },
  'Freighter está en otra red. Cámbiala a Testnet y vuelve a conectar.': {
    en: 'Freighter is on another network. Switch it to Testnet and connect again.',
    pt: 'O Freighter está noutra rede. Mude para Testnet e volte a ligar.',
  },
  'Error del contrato': { en: 'Contract error', pt: 'Erro do contrato' },
  'El enlace de invitación no es válido.': { en: 'The invite link is not valid.', pt: 'A ligação de convite não é válida.' },
  'Escribe un nombre.': { en: 'Type a name.', pt: 'Escreva um nome.' },
  'Máximo {n} caracteres.': { en: 'Maximum {n} characters.', pt: 'Máximo de {n} caracteres.' },
  'Nombre demasiado largo.': { en: 'Name too long.', pt: 'Nome demasiado longo.' },
  'Tu cuenta aún no tiene XLM. Envíale algunos para activarla.': {
    en: 'Your account has no XLM yet. Send it some to activate it.',
    pt: 'A sua conta ainda não tem XLM. Envie-lhe alguns para a ativar.',
  },
  'No pudimos activar tu cuenta de pruebas. Inténtalo de nuevo en unos segundos.': {
    en: "We couldn't activate your test account. Try again in a few seconds.",
    pt: 'Não conseguimos ativar a sua conta de testes. Tente novamente dentro de uns segundos.',
  },
  'No hay ruta para pagar en {code} ahora mismo.': {
    en: 'No route found to pay in {code} right now.',
    pt: 'Não há rota para pagar em {code} neste momento.',
  },
  'El precio ha cambiado. Pide un nuevo precio e inténtalo de nuevo.': {
    en: 'The price moved. Get a new quote and try again.',
    pt: 'O preço mudou. Peça um novo preço e tente novamente.',
  },
  'No tienes suficiente {code} en tu cuenta.': { en: 'Not enough {code} in your wallet.', pt: 'Não tem {code} suficiente na sua conta.' },
  'No hay liquidez suficiente para pagar en {code} ahora mismo.': {
    en: 'Not enough liquidity to pay in {code} right now.',
    pt: 'Não há liquidez suficiente para pagar em {code} neste momento.',
  },
  'El pago ha fallado: {codes}': { en: 'Payment failed: {codes}', pt: 'O pagamento falhou: {codes}' },
  'Has cancelado la transacción en Freighter.': {
    en: 'You cancelled the transaction in Freighter.',
    pt: 'Cancelou a transação no Freighter.',
  },
}
