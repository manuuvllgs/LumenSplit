// Vendored from nidohq/scaffold-template (app-lib/session.ts, Apache-2.0),
// adapted to @stellar/stellar-sdk 17.
// Scoped session keys for Nido (Perch) smart accounts.
//
// Nido's sign popup approves a call under the account's "admin" rule, and
// Perch scopes that rule to the account itself. So the popup cannot authorize
// a call into any other contract: the account answers
// ContextRuleIdsLengthMismatch (#3014) or UnvalidatedContext (#3002). An app
// acts for a Nido account through a session key instead. The owner approves,
// once and with their passkey, a Perch rule that lets a key this app holds call
// one contract's listed functions until an expiry, optionally under a rolling
// spending cap. The account enforces that rule on chain for every later call,
// and the app signs those calls without another prompt.
//
// The app's key is a classic ed25519 key, named in the rule as a CAP-0071
// `Delegated` signer: it signs inside the account's own authorization entry.
// Nido's hosted relayer cannot decode those entries yet, so the key pays its
// own fees (Friendbot funds it on testnet). It never holds the user's money:
// every payment still comes out of the account and counts against the cap.
//
// One key per account and origin. A gate that needs more grants asks for the
// missing ones with the same key, and Nido replaces a rule with the same name,
// so asking again for a label renews or changes that rule in place.
import {
	Account,
	Address,
	Contract,
	Keypair,
	Operation,
	StrKey,
	type Transaction,
	TransactionBuilder,
	authorizeEntry,
	buildWithDelegatesEntry,
	contract,
	nativeToScVal,
	rpc,
	scValToNative,
	xdr,
} from "@stellar/stellar-sdk"

export type GrantDuration = "24h" | "7d" | "30d"
export type LimitPeriod = "day" | "week" | "30d"

/** One rule the owner is asked to approve, as Nido's grant page takes it. */
export interface Grant {
	/** The one contract the key may call. A capped grant must name the token. */
	target: string
	/** Functions the key may call on `target`; every function when omitted. */
	functions?: string[]
	/** When the rule expires. There is no "never" here on purpose. */
	duration: GrantDuration
	/** A rolling cap on `transfer` amounts, in whole-token decimal (XLM). */
	limit?: { amount: string; period: LimitPeriod }
	/** Rule name in the account's policy document, at most 20 bytes. Nido
	 * replaces an existing rule with the same name. */
	label: string
}

/** A grant this app's key asked for. */
export interface SessionGrant extends Grant {
	/** When the approved rule runs out, in ms since the epoch; absent until
	 * the owner approves it. */
	expiresAt?: number
}

export interface Session {
	account: string
	/** The app's key, which the approved rules name as a `Delegated` signer. */
	publicKey: string
	secret: string
	/** Every grant asked for with this key, in request order. */
	grants: SessionGrant[]
	/** Why the last approval did not land, as Nido reported it (a code such as
	 * `FEE_LIMIT_EXCEEDED`, or a message). */
	refused?: string
}

/** What a gate should show for the grants it needs. */
export type SessionStatus =
	| { state: "ready"; expiresAt: number }
	| {
			state: "ask"
			/** The grants to ask for: never approved, changed, or expired. */
			ask: Grant[]
			reason: "new" | "changed" | "expired"
	  }
	| {
			state: "waiting"
			session: Session
			/** Grants sent to Nido with no answer recorded yet. */
			waiting: SessionGrant[]
	  }

/** A rule as the account reports it through `installed_rules()`. */
export interface InstalledRule {
	id: number
	name: string
	/** The contract the rule applies to; `undefined` for any other scope. */
	contract: string | undefined
	/** `G…`/`C…` addresses of the rule's `Delegated` signers. */
	delegated: string[]
	/** Last ledger the rule is valid in, or `undefined` for no expiry. */
	validUntil: number | undefined
}

const STORAGE = "scaffold:nido-session:"
const PENDING = `${STORAGE}pending`
const CHANGE = "scaffold:nido-session-change"
const MAX_LABEL_BYTES = 20
/** How long a signed authorization stays valid: about five minutes. */
const AUTH_LIFETIME_LEDGERS = 60
/** Nido turns a duration into ledgers at five seconds each. */
const LEDGER_MS = 5_000
const DURATION_MS: Record<GrantDuration, number> = {
	"24h": 86_400_000,
	"7d": 7 * 86_400_000,
	"30d": 30 * 86_400_000,
}
/** Treat an approval as expired this long before its estimated end, so a
 * call doesn't race the rule's last ledgers. */
const EXPIRY_MARGIN_MS = 120_000
const NEVER = Number.MAX_SAFE_INTEGER

// --- Persistence -----------------------------------------------------------
// The secret sits in this origin's localStorage. That is the trade the grant
// makes explicit: whoever reads it can spend at most the cap until expiry.
// Origins include the port, so a dev server on another port has no session.

export function loadSession(account: string): Session | undefined {
	const raw = localStorage.getItem(STORAGE + account)
	if (!raw) return undefined
	const session = JSON.parse(raw) as Session & { approved?: number }
	// Sessions stored before expiry tracking: approved, end unknown, so renew.
	if (typeof session.approved === "number") {
		const approved = session.approved
		session.grants = session.grants.map((g, i) =>
			i < approved ? { ...g, expiresAt: 0 } : g,
		)
		delete session.approved
	}
	return session
}

function saveSession(session: Session) {
	localStorage.setItem(STORAGE + session.account, JSON.stringify(session))
	changed()
}

export function forgetSession(account: string) {
	localStorage.removeItem(STORAGE + account)
	if (localStorage.getItem(PENDING) === account)
		localStorage.removeItem(PENDING)
	changed()
}

function changed() {
	globalThis.dispatchEvent?.(new Event(CHANGE))
}

/** Call `listener` whenever this tab or another one changes a session. */
export function onSessionChange(listener: () => void): () => void {
	globalThis.addEventListener?.(CHANGE, listener)
	globalThis.addEventListener?.("storage", listener)
	return () => {
		globalThis.removeEventListener?.(CHANGE, listener)
		globalThis.removeEventListener?.("storage", listener)
	}
}

/** The session for `account` when it holds at least one approved, unexpired
 * grant. Whether it covers a particular call is the account's decision. */
export function activeSession(
	account: string,
	now = Date.now(),
): Session | undefined {
	const session = loadSession(account)
	return session?.grants.some((g) => live(g, now)) ? session : undefined
}

// --- Coverage ----------------------------------------------------------------

const live = (g: SessionGrant, now: number) =>
	g.expiresAt !== undefined && g.expiresAt - EXPIRY_MARGIN_MS > now


/** Whether a rule asked for as `held` allows everything `wanted` does. */
function allows(held: Grant, wanted: Grant): boolean {
	if (held.target !== wanted.target) return false
	const functions = held.functions?.length
		? wanted.functions?.length &&
			wanted.functions.every((f) => held.functions!.includes(f))
		: true
	const limit = held.limit
		? wanted.limit?.amount === held.limit.amount &&
			wanted.limit.period === held.limit.period
		: !wanted.limit
	return Boolean(functions) && limit
}

/**
 * How far `session` covers the grants a screen needs at `now`: which of them
 * still have to be asked for (never asked, changed since, or expired), which
 * were sent to Nido without an answer yet, and when the covering approvals
 * run out.
 */
export function sessionCovers(
	session: Session | undefined,
	required: Grant[],
	now = Date.now(),
): {
	ask: Grant[]
	expired: Grant[]
	waiting: SessionGrant[]
	expiresAt: number | undefined
} {
	const ask: Grant[] = []
	const expired: Grant[] = []
	const waiting: SessionGrant[] = []
	let expiresAt: number | undefined
	for (const wanted of required) {
		const held = session?.grants.filter((g) => allows(g, wanted)).at(-1)
		if (!held) ask.push(wanted)
		else if (held.expiresAt === undefined) waiting.push(held)
		else if (!live(held, now)) {
			ask.push(wanted)
			expired.push(wanted)
		} else expiresAt = Math.min(expiresAt ?? NEVER, held.expiresAt)
	}
	return { ask, expired, waiting, expiresAt }
}

/** What a gate needing `required` should show for `account` right now. */
export function sessionStatus(
	account: string,
	required: Grant[],
	now = Date.now(),
): SessionStatus {
	const session = loadSession(account)
	const { ask, expired, waiting, expiresAt } = sessionCovers(
		session,
		required,
		now,
	)
	if (session && waiting.length) return { state: "waiting", session, waiting }
	if (ask.length)
		return {
			state: "ask",
			ask,
			reason: !session?.grants.some((g) => g.expiresAt !== undefined)
				? "new"
				: expired.length === ask.length
					? "expired"
					: "changed",
		}
	return { state: "ready", expiresAt: expiresAt ?? NEVER }
}

// --- Grant requests ----------------------------------------------------------

/** Nido's grant page for one rule (`/security/delegate-doc/`). */
export function grantUrl(args: {
	base: string
	account: string
	signer: string
	grant: Grant
	returnUrl: string
}): string {
	const { base, account, signer, grant, returnUrl } = args
	if (!StrKey.isValidContract(account))
		throw new Error(`Not a smart account: ${account}`)
	if (new TextEncoder().encode(grant.label).length > MAX_LABEL_BYTES)
		throw new Error(`Grant label "${grant.label}" is over 20 bytes`)
	const [scheme, host] = base.includes("://")
		? base.split("://")
		: ["https", base]
	const url = new URL(
		`${scheme}://${account.toLowerCase()}.${host}/security/delegate-doc/`,
	)
	const set = (key: string, value: string) => url.searchParams.set(key, value)
	set("origin", new URL(returnUrl).origin)
	set("target", grant.target)
	set("signer", signer)
	if (grant.functions?.length) set("functions", grant.functions.join(","))
	set("duration", grant.duration)
	if (grant.limit) {
		set("limit", grant.limit.amount)
		set("limit_period", grant.limit.period)
	}
	set("label", grant.label)
	set("return", returnUrl)
	return url.toString()
}

const asked = ({ target, functions, duration, limit, label }: Grant) => ({
	target,
	...(functions ? { functions } : {}),
	duration,
	...(limit ? { limit } : {}),
	label,
})

/**
 * Send the owner to Nido to approve `grants`, one passkey confirmation each,
 * and come back here (resume with `resumeSession` on the next page load).
 * Reuses this account's key when the app already holds one, so only a first
 * request waits for Friendbot. Navigates away. Testnet only, like hosted Nido.
 */
export async function requestSession(args: {
	account: string
	grants: Grant[]
	base: string
	friendbotUrl: (address: string) => string
}): Promise<never> {
	const { account, grants, base } = args
	if (!grants.length) throw new Error("A session needs at least one grant")
	let session = loadSession(account)
	if (!session) {
		const key = Keypair.random()
		const funded = await fetch(args.friendbotUrl(key.publicKey()))
		if (!funded.ok)
			throw new Error(`Could not fund the session key (${funded.status})`)
		session = {
			account,
			publicKey: key.publicKey(),
			secret: key.secret(),
			grants: [],
		}
	}
	const labels = new Set(grants.map((g) => g.label))
	session.grants = [
		...session.grants.filter((g) => !labels.has(g.label)),
		...grants.map(asked),
	]
	delete session.refused
	saveSession(session)
	localStorage.setItem(PENDING, account)
	redirectToGrant(session, base)
	// The page is navigating away; never settle.
	return new Promise<never>(() => {})
}

function redirectToGrant(session: Session, base: string) {
	const grant = session.grants.find((g) => g.expiresAt === undefined)
	if (!grant) return
	const back = new URL(window.location.href)
	back.search = ""
	back.hash = ""
	window.location.assign(
		grantUrl({
			base,
			account: session.account,
			signer: session.publicKey,
			grant,
			returnUrl: back.toString(),
		}),
	)
}

export interface ResumeResult {
	account: string
	outcome: "approved" | "next-grant" | "cancelled" | "refused"
	/** Set when this app's key submitted the approval itself. */
	hash?: string
	/** For `refused`: what went wrong, in words a person can act on. */
	message?: string
}

/** Nido's answer parameters, from the query or the fragment. */
const ANSWER = ["delegation", "code", "retry_after", "payload"]

/**
 * Call once on page load. Records Nido's answer for the pending session and
 * removes it from the address bar, then moves on to the next grant if there
 * is one. The answer is `?delegation=` (or `#delegation=`) with:
 *
 * - `ok`: the grant landed.
 * - `cancelled`: the owner said no; unanswered grants are dropped, the key
 *   and anything already approved stay.
 * - `error&code=…`: Nido could not apply it (e.g. `FEE_LIMIT_EXCEEDED` when
 *   its relayer's budget is spent); the grant waits for a retry.
 * - `signed&payload=…`: Nido's relayer refused, so Nido handed back the
 *   passkey-signed call (`{func, auth}`, base64url JSON) and this app's own
 *   funded key pays to submit it.
 */
export async function resumeSession(args: {
	base: string
	server: rpc.Server
	networkPassphrase: string
}): Promise<ResumeResult | null> {
	const url = new URL(window.location.href)
	const hash = new URLSearchParams(url.hash.slice(1))
	const answer = (key: string) =>
		url.searchParams.get(key) ?? hash.get(key) ?? undefined
	const delegation = answer("delegation")
	const account = localStorage.getItem(PENDING)
	if (!delegation || !account) return null
	const code = answer("code")
	const payload = answer("payload")
	for (const key of ANSWER) {
		url.searchParams.delete(key)
		hash.delete(key)
	}
	url.hash = hash.toString()
	window.history.replaceState(null, "", url)

	const session = loadSession(account)
	const current = session?.grants.find((g) => g.expiresAt === undefined)
	if (!session || !current) {
		localStorage.removeItem(PENDING)
		return { account, outcome: "cancelled" }
	}
	let submitted: string | undefined
	if (delegation === "signed") {
		try {
			submitted = await submitSignedPayload(
				payload ?? "",
				session,
				args.server,
				args.networkPassphrase,
			)
		} catch (error) {
			return refuse(session, describe(error))
		}
	} else if (delegation === "error") {
		return refuse(
			session,
			code ?? "Nido could not apply the approval and gave no reason.",
		)
	} else if (delegation !== "ok") {
		session.grants = session.grants.filter((g) => g.expiresAt !== undefined)
		saveSession(session)
		localStorage.removeItem(PENDING)
		return { account, outcome: "cancelled" }
	}
	current.expiresAt = Date.now() + DURATION_MS[current.duration]
	saveSession(session)
	if (session.grants.some((g) => g.expiresAt === undefined)) {
		redirectToGrant(session, args.base)
		return { account, outcome: "next-grant", hash: submitted }
	}
	localStorage.removeItem(PENDING)
	return { account, outcome: "approved", hash: submitted }
}

function refuse(session: Session, reason: string): ResumeResult {
	session.refused = reason
	saveSession(session)
	localStorage.removeItem(PENDING)
	return {
		account: session.account,
		outcome: "refused",
		message: describe(reason),
	}
}

/**
 * Read the account's rules and record what actually landed for this app's
 * key. Nido's page can report a failure for a grant that went through (a
 * gateway timeout after submission) or lose the way back here; the account's
 * installed rules are the truth. Grants found on chain are approved with
 * their real expiry; approved grants whose rule is gone (replaced by another
 * key, or never applied) are dropped. Returns how many grants still wait.
 */
export async function checkSession(
	account: string,
	server: rpc.Server,
	networkPassphrase: string,
): Promise<{ approved: number; waiting: number }> {
	const session = loadSession(account)
	if (!session) return { approved: 0, waiting: 0 }
	const { rules, latestLedger } = await readRules(
		account,
		server,
		networkPassphrase,
		session.publicKey,
	)
	const now = Date.now()
	session.grants = session.grants.flatMap((g) => {
		const rule = rules.find(
			(r) =>
				r.name === g.label &&
				r.contract === g.target &&
				r.delegated.includes(session.publicKey),
		)
		if (rule)
			return [
				{
					...g,
					expiresAt:
						rule.validUntil === undefined
							? NEVER
							: now + (rule.validUntil - latestLedger) * LEDGER_MS,
				},
			]
		return g.expiresAt === undefined ? [g] : []
	})
	const waiting = session.grants.filter((g) => g.expiresAt === undefined)
	if (!waiting.length) {
		delete session.refused
		if (localStorage.getItem(PENDING) === account)
			localStorage.removeItem(PENDING)
	}
	saveSession(session)
	return {
		approved: session.grants.length - waiting.length,
		waiting: waiting.length,
	}
}

// --- Authorization -----------------------------------------------------------

/** Contract addresses an auth entry authorizes, in the order the host passes
 * them to `__check_auth`: the root call, then its sub-calls depth first. */
export function authContexts(
	invocation: xdr.SorobanAuthorizedInvocation,
): string[] {
	// Adapted to @stellar/stellar-sdk 17: XDR fields are properties and unions
	// expose their variant as `.type`.
	const fn = invocation.function
	const own =
		fn.type === "sorobanAuthorizedFunctionTypeContractFn"
			? [Address.fromScAddress(fn.contractFn.contractAddress).toString()]
			: ["create-contract"]
	return [...own, ...invocation.subInvocations.flatMap(authContexts)]
}

/**
 * For each context, the rule that lets `signer` act there. Throws, naming the
 * contract, when no unexpired rule covers a context: the app needs another
 * grant before it can make this call.
 */
export function ruleIdsFor(
	contexts: string[],
	rules: InstalledRule[],
	signer: string,
	ledger: number,
): number[] {
	return contexts.map((target) => {
		const rule = rules.find(
			(r) =>
				r.contract === target &&
				r.delegated.includes(signer) &&
				(r.validUntil === undefined || r.validUntil >= ledger),
		)
		if (!rule)
			throw new Error(
				`This app's session does not cover calls to ${target} (or it expired). Ask for a grant on that contract.`,
			)
		return rule.id
	})
}

/** The `AuthPayload` a Perch account reads from its credential: the rule per
 * context and the signers. A `Delegated` signer's bytes stay empty, because
 * its signature travels in the CAP-0071 delegate list instead. */
export function authPayload(ruleIds: number[], signer: string): xdr.ScVal {
	return xdr.ScVal.scvMap([
		new xdr.ScMapEntry({
			key: xdr.ScVal.scvSymbol("context_rule_ids"),
			val: xdr.ScVal.scvVec(ruleIds.map((id) => xdr.ScVal.scvU32(id))),
		}),
		new xdr.ScMapEntry({
			key: xdr.ScVal.scvSymbol("signers"),
			val: xdr.ScVal.scvMap([
				new xdr.ScMapEntry({
					key: xdr.ScVal.scvVec([
						xdr.ScVal.scvSymbol("Delegated"),
						new Address(signer).toScVal(),
					]),
					val: nativeToScVal(new Uint8Array(0)),
				}),
			]),
		}),
	])
}

type NativeRule = {
	id: number
	name: string
	context_type: unknown
	signers: unknown[]
	valid_until?: number | null
}

/** Decode `installed_rules()` output (`scValToNative` form). */
export function parseRules(native: NativeRule[]): InstalledRule[] {
	const variant = (v: unknown): [string, unknown] | undefined =>
		Array.isArray(v) && typeof v[0] === "string"
			? [v[0], v[1]]
			: v && typeof v === "object"
				? (Object.entries(v)[0] as [string, unknown])
				: undefined
	return native.map((rule) => {
		const scope = variant(rule.context_type)
		return {
			id: Number(rule.id),
			name: String(rule.name),
			contract: scope?.[0] === "CallContract" ? String(scope[1]) : undefined,
			delegated: rule.signers.flatMap((s) => {
				const signer = variant(s)
				return signer?.[0] === "Delegated" ? [String(signer[1])] : []
			}),
			validUntil:
				rule.valid_until === null || rule.valid_until === undefined
					? undefined
					: Number(rule.valid_until),
		}
	})
}

/** The address an unsigned auth entry asks to authorize, if any. */
function credentialAddress(
	entry: xdr.SorobanAuthorizationEntry,
): string | undefined {
	const creds = entry.credentials
	switch (creds.type) {
		case "sorobanCredentialsAddress":
			return Address.fromScAddress(creds.address.address).toString()
		case "sorobanCredentialsAddressV2":
			return Address.fromScAddress(creds.addressV2.address).toString()
		default:
			return undefined
	}
}

/** Read the account's installed rules through a read-only simulation. */
export async function readRules(
	account: string,
	server: rpc.Server,
	networkPassphrase: string,
	source: string,
): Promise<{ rules: InstalledRule[]; latestLedger: number }> {
	const tx = new TransactionBuilder(await server.getAccount(source), {
		fee: "100",
		networkPassphrase,
	})
		.addOperation(new Contract(account).call("installed_rules"))
		.setTimeout(30)
		.build()
	const sim = await server.simulateTransaction(tx)
	if (!rpc.Api.isSimulationSuccess(sim) || !sim.result)
		throw new Error(`Could not read the rules of ${account}`)
	return {
		rules: parseRules(scValToNative(sim.result.retval) as NativeRule[]),
		latestLedger: sim.latestLedger,
	}
}

// --- Errors ------------------------------------------------------------------

/** A generated client's `Errors` table, or your own: code → text. */
export type ContractErrors = Record<number, string | { message: string }>

/** Codes Nido's relayer refuses with. In both cases nothing was submitted. */
const RELAYER: Record<string, string> = {
	FEE_LIMIT_EXCEEDED:
		"Nido's free transaction budget is used up for now, so nothing was sent. Try again later.",
	POOL_CAPACITY:
		"Nido's relayer is busy, so nothing was sent. Try again in a minute.",
}

const OVER_CAP =
	"Your account refused: this would go over the spending cap you gave this app."

/** Whether the account refused a call because it would go over a grant's
 * spending cap (#3221). The account checks before anything is sent, so the
 * refused call cost nothing. */
export function isOverCap(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error)
	return message.includes("#3221") || message.includes(OVER_CAP)
}

function accountRefusal(message: string): string | undefined {
	if (message.includes("#3221")) return OVER_CAP
	if (message.includes("#3002") || message.includes("#3016"))
		return "Your account refused: no approved rule covers this call for this app (it may have expired)."
	if (message.includes("#3014"))
		return "Your account refused: the call touches a contract the app has no rule for."
}

/** Turn the account's refusal codes into something a person can act on. */
export const explainRefusal = (message: string): string =>
	accountRefusal(message) ?? message

/**
 * Say what went wrong in words a person can act on: the account's refusals
 * (#3221 over the cap, #3002/#3016 no rule or expired, #3014 an uncovered
 * contract), Nido relayer codes, and your contract's own `Error(Contract, #n)`
 * looked up in `contractErrors` (a generated client's `Errors` export works).
 */
export function describe(
	error: unknown,
	contractErrors?: ContractErrors,
): string {
	const message = error instanceof Error ? error.message : String(error)
	const refusal = accountRefusal(message)
	if (refusal) return refusal
	const relayer = Object.keys(RELAYER).find((code) => message.includes(code))
	if (relayer) return RELAYER[relayer]!
	const own = /Error\(Contract, #(\d+)\)/.exec(message)
	const entry = own && contractErrors?.[Number(own[1])]
	if (entry && !message.includes("Error(Auth"))
		return `The contract refused: ${typeof entry === "string" ? entry : entry.message}`
	return message
}

// --- Submission --------------------------------------------------------------

/** Sign `tx` with `key`, send it, and wait for the network's verdict. */
async function sendAndConfirm(
	tx: Transaction,
	key: Keypair,
	server: rpc.Server,
): Promise<{ hash: string; returnValue: xdr.ScVal | undefined }> {
	tx.sign(key)
	const sent = await server.sendTransaction(tx)
	if (sent.status === "ERROR")
		throw new Error(`The network rejected ${sent.hash}`)
	const done = await server.pollTransaction(sent.hash, { attempts: 30 })
	if (done.status !== rpc.Api.GetTransactionStatus.SUCCESS)
		throw new Error(`Transaction ${sent.hash} ${done.status.toLowerCase()}`)
	return { hash: sent.hash, returnValue: done.returnValue }
}

/**
 * Submit a call Nido's passkey already authorized, paying the fee with this
 * app's key. The passkey signs the call and a nonce, not the fee payer, so
 * any funded key can submit what Nido's relayer refused. Only a call on the
 * session's own account, authorized by that account alone, is accepted.
 */
export async function submitSignedPayload(
	payload: string,
	session: Session,
	server: rpc.Server,
	networkPassphrase: string,
): Promise<string> {
	let parsed: { func: string; auth: string[] }
	try {
		const json = payload.trimStart().startsWith("{")
			? payload
			: new TextDecoder().decode(
					Uint8Array.from(
						atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
						(c) => c.charCodeAt(0),
					),
				)
		parsed = JSON.parse(json) as typeof parsed
	} catch {
		throw new Error("Nido's signed approval could not be read")
	}
	const func = xdr.HostFunction.fromXDR(parsed.func, "base64")
	const auth = parsed.auth.map((a) =>
		xdr.SorobanAuthorizationEntry.fromXDR(a, "base64"),
	)
	if (
		func.type !== "hostFunctionTypeInvokeContract" ||
		Address.fromScAddress(func.invokeContract.contractAddress).toString() !==
			session.account ||
		!auth.length ||
		auth.some((entry) => credentialAddress(entry) !== session.account)
	)
		throw new Error("Nido's signed approval is not a change to your account")
	const key = Keypair.fromSecret(session.secret)
	const tx = new TransactionBuilder(await server.getAccount(key.publicKey()), {
		fee: "1000000",
		networkPassphrase,
	})
		.addOperation(Operation.invokeHostFunction({ func, auth }))
		.setTimeout(60)
		.build()
	const sim = await server.simulateTransaction(tx)
	if (!rpc.Api.isSimulationSuccess(sim)) throw new Error(describe(sim.error))
	const { hash } = await sendAndConfirm(
		rpc.assembleTransaction(tx, sim).build(),
		key,
		server,
	)
	return hash
}

/**
 * Sign `tx`'s call with the session key under the account's approved rules,
 * submit it with the key as fee source, and return the confirmed result.
 */
export async function submitWithSession<T>(
	tx: contract.AssembledTransaction<T>,
	session: Session,
	server: rpc.Server,
	networkPassphrase: string,
): Promise<{ result: T; hash: string }> {
	if (!tx.built) throw new Error("Simulate the call before submitting it")
	const op = tx.built.operations[0]
	if (op?.type !== "invokeHostFunction")
		throw new Error("Session keys only sign contract calls")
	const key = Keypair.fromSecret(session.secret)
	const sequence = (await server.getAccount(key.publicKey())).sequenceNumber()
	const build = (auth: xdr.SorobanAuthorizationEntry[]) =>
		new TransactionBuilder(new Account(key.publicKey(), sequence), {
			fee: "1000000",
			networkPassphrase,
		})
			.addOperation(Operation.invokeHostFunction({ func: op.func, auth }))
			.setTimeout(60)
			.build()

	const recorded = await server.simulateTransaction(build([]))
	if (!rpc.Api.isSimulationSuccess(recorded))
		throw new Error(explainRefusal(recorded.error))
	const { rules } = await readRules(
		session.account,
		server,
		networkPassphrase,
		key.publicKey(),
	)
	const validUntil = recorded.latestLedger + AUTH_LIFETIME_LEDGERS
	const auth = await Promise.all(
		(recorded.result?.auth ?? []).map(async (entry) => {
			if (credentialAddress(entry) !== session.account) return entry
			const ruleIds = ruleIdsFor(
				authContexts(entry.rootInvocation),
				rules,
				key.publicKey(),
				recorded.latestLedger,
			)
			const delegated = buildWithDelegatesEntry({
				entry,
				validUntilLedgerSeq: validUntil,
				delegates: [{ address: key.publicKey() }],
				signature: authPayload(ruleIds, key.publicKey()),
			})
			return authorizeEntry(
				delegated,
				key,
				validUntil,
				networkPassphrase,
				key.publicKey(),
			)
		}),
	)

	const signed = build(auth)
	const enforced = await server.simulateTransaction(
		signed,
		undefined,
		"enforce",
	)
	if (!rpc.Api.isSimulationSuccess(enforced))
		throw new Error(explainRefusal(enforced.error))
	const { hash, returnValue } = await sendAndConfirm(
		rpc.assembleTransaction(signed, enforced).build(),
		key,
		server,
	)
	if (!returnValue) throw new Error(`Transaction ${hash} has no return value`)
	return { result: tx.options.parseResultXdr(returnValue), hash }
}
