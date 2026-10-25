import { Card, PageHeader, Icon } from '../components/ui'
import { getLang, t, type Lang } from '../i18n'

type QA = { q: string; a: string }

const FAQ: Record<Lang, QA[]> = {
  es: [
    {
      q: '¿Qué es LumenSplit?',
      a: 'Una aplicación innovadora para compartir gastos construida sobre la blockchain de Stellar. Registras los gastos del grupo y saldas las deudas desde la propia app: el dinero llega en unos 5 segundos a cualquier país, la comisión es una fracción de céntimo, y el historial vive en un contrato inteligente que nadie puede modificar.',
    },
    {
      q: '¿Necesito saber de criptomonedas?',
      a: 'No. Solo necesitas la extensión Freighter, que hace de cartera: con ella entras y firmas cada movimiento. Todo lo demás son importes, nombres y botones de "Pagar".',
    },
    {
      q: '¿Es dinero real?',
      a: 'En esta versión no. Funciona en la red de pruebas de Stellar (testnet), donde el dinero no tiene valor y se consigue gratis. El mismo código funcionaría en la red principal con dinero real.',
    },
    {
      q: '¿Cómo lo pruebo?',
      a: '1) Instala Freighter desde freighter.app y crea una cuenta. 2) En Freighter, cambia la red a "Testnet". 3) Conecta tu cartera aquí: si tu cuenta es nueva, la activamos con fondos de prueba. 4) Crea un grupo e invita a tus amigos con el enlace o el QR.',
    },
    {
      q: '¿Cómo se reparten los gastos?',
      a: 'A partes iguales o con un importe distinto para cada persona. El contrato hace las cuentas y el saldo del grupo siempre suma cero: en verde lo que te deben y en rojo lo que debes.',
    },
    {
      q: '¿Qué hace "Saldar cuentas"?',
      a: 'Calcula el mínimo número de pagos para que todos queden a cero, en lugar de que cada uno pague a cada uno. Con "Saldar todo" pagas todas tus deudas del grupo con una sola firma: o se hacen todos los pagos o ninguno.',
    },
    {
      q: '¿Qué es "Pagar en euros" y qué es EURT?',
      a: 'Si solo tienes euros, la red de Stellar los convierte al instante en la moneda del grupo usando su mercado de cambio integrado, y la otra persona recibe la cantidad exacta. EURT es un euro de prueba que hemos creado en testnet; en producción sería un euro digital real como EURC.',
    },
    {
      q: '¿Cómo funcionan las invitaciones?',
      a: 'Quien está en el grupo crea un enlace o un QR y lo comparte. El enlace lleva un código secreto que nunca llega a ningún servidor; en la red solo se guarda su huella (hash), así que nadie puede colarse en un grupo adivinando su número.',
    },
    {
      q: '¿Quién puede ver mis gastos?',
      a: 'El registro está en una red pública: cualquiera podría consultar los gastos y saldos de un grupo, igual que en un extracto público. Es la base de que nadie pueda modificar el historial. No guardes descripciones con datos sensibles.',
    },
    {
      q: '¿Usáis cookies?',
      a: 'No. No hay cookies, ni analítica, ni seguimiento. El navegador solo recuerda la cuenta conectada y los apodos que pongas, y no salen de tu dispositivo. Tu nombre se guarda en tu propia cuenta de Stellar, y solo si tú lo eliges.',
    },
  ],
  en: [
    {
      q: 'What is LumenSplit?',
      a: 'An innovative app for sharing expenses, built on the Stellar blockchain. You log the group expenses and settle debts from inside the app: money arrives in about 5 seconds anywhere in the world, the fee is a fraction of a cent, and the history lives in a smart contract nobody can modify.',
    },
    {
      q: 'Do I need to know about crypto?',
      a: 'No. You only need the Freighter browser extension, which works as your wallet: you sign in and approve each action with it. Everything else is amounts, names and "Pay" buttons.',
    },
    {
      q: 'Is this real money?',
      a: 'Not in this version. It runs on the Stellar test network (testnet), where money has no value and is free to get. The same code would run on mainnet with real money.',
    },
    {
      q: 'How do I try it?',
      a: '1) Install Freighter from freighter.app and create an account. 2) In Freighter, switch the network to "Testnet". 3) Connect your wallet here: if your account is new, we activate it with test funds. 4) Create a group and invite friends with the link or QR code.',
    },
    {
      q: 'How are expenses split?',
      a: 'Equally, or with a different amount for each person. The contract does the maths and the group always sums to zero: green is what you are owed, red is what you owe.',
    },
    {
      q: 'What does "Settle up" do?',
      a: 'It works out the fewest payments that bring everyone to zero, instead of everyone paying everyone. With "Settle all" you pay every debt you have in the group with a single signature: either all payments go through or none do.',
    },
    {
      q: 'What is "Pay in euros" and what is EURT?',
      a: 'If you only hold euros, Stellar converts them instantly into the group currency through its built-in exchange, and the other person receives the exact amount. EURT is a test euro we issued on testnet; in production it would be a real digital euro such as EURC.',
    },
    {
      q: 'How do invitations work?',
      a: 'Any group member creates a link or QR code and shares it. The link carries a secret code that never reaches any server; only its fingerprint (hash) is stored on-chain, so nobody can join a group by guessing its number.',
    },
    {
      q: 'Who can see my expenses?',
      a: 'The ledger is on a public network: anyone could look up a group’s expenses and balances, like a public statement. That is what makes the history impossible to tamper with. Avoid putting sensitive details in descriptions.',
    },
    {
      q: 'Do you use cookies?',
      a: 'No. No cookies, no analytics, no tracking. Your browser only remembers the connected account and the nicknames you set, and they never leave your device. Your name is stored on your own Stellar account, and only if you choose one.',
    },
  ],
  pt: [
    {
      q: 'O que é o LumenSplit?',
      a: 'Uma aplicação inovadora para partilhar despesas, construída sobre a blockchain Stellar. Regista as despesas do grupo e acerta as dívidas a partir da própria app: o dinheiro chega em cerca de 5 segundos a qualquer país, a comissão é uma fração de cêntimo e o histórico vive num contrato inteligente que ninguém pode alterar.',
    },
    {
      q: 'Preciso de saber de criptomoedas?',
      a: 'Não. Só precisa da extensão Freighter, que funciona como carteira: com ela entra e assina cada operação. Tudo o resto são valores, nomes e botões de "Pagar".',
    },
    {
      q: 'É dinheiro real?',
      a: 'Nesta versão, não. Funciona na rede de testes da Stellar (testnet), onde o dinheiro não tem valor e é gratuito. O mesmo código funcionaria na rede principal com dinheiro real.',
    },
    {
      q: 'Como experimento?',
      a: '1) Instale o Freighter em freighter.app e crie uma conta. 2) No Freighter, mude a rede para "Testnet". 3) Ligue aqui a sua carteira: se a conta for nova, ativamo-la com fundos de teste. 4) Crie um grupo e convide os seus amigos com a ligação ou o QR.',
    },
    {
      q: 'Como se dividem as despesas?',
      a: 'Em partes iguais ou com um valor diferente para cada pessoa. O contrato faz as contas e o saldo do grupo soma sempre zero: a verde o que lhe devem e a vermelho o que deve.',
    },
    {
      q: 'O que faz "Acertar contas"?',
      a: 'Calcula o número mínimo de pagamentos para que todos fiquem a zero, em vez de cada um pagar a cada um. Com "Acertar tudo" paga todas as suas dívidas do grupo com uma só assinatura: ou se fazem todos os pagamentos ou nenhum.',
    },
    {
      q: 'O que é "Pagar em euros" e o que é o EURT?',
      a: 'Se só tiver euros, a rede Stellar converte-os no momento na moeda do grupo através do seu mercado de câmbio integrado, e a outra pessoa recebe o valor exato. O EURT é um euro de teste que criámos na testnet; em produção seria um euro digital real, como o EURC.',
    },
    {
      q: 'Como funcionam os convites?',
      a: 'Quem está no grupo cria uma ligação ou um QR e partilha-o. A ligação leva um código secreto que nunca chega a nenhum servidor; na rede só se guarda a sua impressão digital (hash), por isso ninguém consegue entrar num grupo adivinhando o seu número.',
    },
    {
      q: 'Quem pode ver as minhas despesas?',
      a: 'O registo está numa rede pública: qualquer pessoa poderia consultar as despesas e os saldos de um grupo, como num extrato público. É isso que impede que alguém altere o histórico. Não ponha dados sensíveis nas descrições.',
    },
    {
      q: 'Usam cookies?',
      a: 'Não. Não há cookies, nem analítica, nem rastreio. O navegador só guarda a conta ligada e as alcunhas que definir, e nada sai do seu dispositivo. O seu nome fica guardado na sua própria conta Stellar, e só se o escolher.',
    },
  ],
}

export default function Faq() {
  const items = FAQ[getLang()]
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('Preguntas frecuentes')} back="/" />
      <Card className="divide-y divide-ink-200 p-0! sm:p-0!">
        {items.map((item) => (
          <details key={item.q} className="group px-4 sm:px-6">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-lg font-semibold text-ink-900">
              {item.q}
              <Icon name="plus" className="h-5 w-5 text-ink-500 transition-transform group-open:rotate-45" />
            </summary>
            <p className="max-w-[65ch] pb-5 text-base leading-relaxed text-ink-700">{item.a}</p>
          </details>
        ))}
      </Card>
    </div>
  )
}
