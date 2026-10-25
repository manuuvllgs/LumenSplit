/**
 * Pay-in-your-currency for LumenSplit.
 *
 * A debtor can pay what they owe using any asset they hold (EURT, USDC, ...).
 * A Stellar path payment converts it through the network's DEX/AMM into the
 * exact amount of XLM owed, sent to the debtor's own account. Then the normal
 * `settle` call on the contract moves that XLM to the creditor.
 *
 * Two Freighter signatures: Soroban contract calls cannot share a
 * transaction with classic operations.
 *
 * UI usage:
 *   const q = await quotePayIn(PAY_ASSET, "43");        // show "≈ 10.86 EURT"
 *   const swap = await swapToXlm(me, PAY_ASSET, "43", q); // Freighter #1
 *   await settle(groupId, creditor, "43");                // Freighter #2 (existing function)
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

export const HORIZON_URL: string =
  import.meta.env.VITE_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const EXPLORER_TX_URL = "https://stellar.expert/explorer/testnet/tx/";

/** Extra the payer allows on top of the quote, in case the price moves. */
const SLIPPAGE = 0.01;

const horizon = new Horizon.Server(HORIZON_URL);

export interface PayAsset {
  code: string;
  issuer: string;
}

export interface Quote {
  /** Amount of the payer's asset needed, as a human string, e.g. "10.8611" */
  sourceAmount: string;
  /** Max the payer will spend including slippage */
  sendMax: string;
  /** Intermediate hops chosen by the network */
  path: Asset[];
  /** Human-readable route, e.g. "EURT → XLM" */
  route: string;
}

export interface SwapResult {
  hash: string;
  explorerUrl: string;
}

/** Parses "EURT:GABC..." from VITE_PAY_ASSET. */
export function parsePayAsset(value: string | undefined): PayAsset | null {
  if (!value) return null;
  const [code, issuer] = value.split(":");
  return code && issuer ? { code, issuer } : null;
}

/** Asset configured for "pay in euros", or null if not set. */
export const PAY_ASSET: PayAsset | null = parsePayAsset(import.meta.env.VITE_PAY_ASSET);

function toAsset(a: PayAsset): Asset {
  return new Asset(a.code, a.issuer);
}

function label(a: Asset): string {
  return a.isNative() ? "XLM" : a.getCode();
}

/** Stellar amounts have at most 7 decimals. */
function fmt(n: number): string {
  return (Math.ceil(n * 1e7) / 1e7).toFixed(7).replace(/\.?0+$/, "");
}

/** How much of `asset` the payer needs to deliver `xlmAmount` XLM. */
export async function quotePayIn(asset: PayAsset, xlmAmount: string): Promise<Quote> {
  const src = toAsset(asset);
  const res = await horizon.strictReceivePaths([src], Asset.native(), xlmAmount).call();
  if (res.records.length === 0) {
    throw new Error(`No route found to pay in ${asset.code} right now.`);
  }
  const best = res.records.reduce((a, b) =>
    Number(b.source_amount) < Number(a.source_amount) ? b : a,
  );
  const path = best.path.map((p) =>
    p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code!, p.asset_issuer!),
  );
  const sourceAmount = Number(best.source_amount);
  return {
    sourceAmount: fmt(sourceAmount),
    sendMax: fmt(sourceAmount * (1 + SLIPPAGE)),
    path,
    route: [label(src), ...path.map(label), "XLM"].join(" → "),
  };
}

/** Balance of `asset` in `address`, as a human string ("0" if no trustline). */
export async function getAssetBalance(address: string, asset: PayAsset): Promise<string> {
  const account = await horizon.loadAccount(address);
  const line = account.balances.find(
    (b) =>
      "asset_code" in b && b.asset_code === asset.code && "asset_issuer" in b && b.asset_issuer === asset.issuer,
  );
  return line ? line.balance : "0";
}

/**
 * Converts the payer's `asset` into exactly `xlmAmount` XLM in their own account.
 * Call `settle` right after to pay the creditor.
 */
export async function swapToXlm(
  address: string,
  asset: PayAsset,
  xlmAmount: string,
  quote?: Quote,
): Promise<SwapResult> {
  const q = quote ?? (await quotePayIn(asset, xlmAmount));
  const account = await horizon.loadAccount(address);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: toAsset(asset),
        sendMax: q.sendMax,
        destination: address,
        destAsset: Asset.native(),
        destAmount: xlmAmount,
        path: q.path,
      }),
    )
    .setTimeout(120)
    .build();

  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  if (signed.error) {
    throw new Error(signed.error.message ?? "Transaction cancelled in Freighter.");
  }

  try {
    const res = await horizon.submitTransaction(
      TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE),
    );
    return { hash: res.hash, explorerUrl: EXPLORER_TX_URL + res.hash };
  } catch (e: unknown) {
    const codes = (e as { response?: { data?: { extras?: { result_codes?: { operations?: string[] } } } } })
      ?.response?.data?.extras?.result_codes?.operations ?? [];
    if (codes.includes("op_over_source_max")) {
      throw new Error("The price moved. Get a new quote and try again.");
    }
    if (codes.includes("op_underfunded")) {
      throw new Error(`Not enough ${asset.code} in your wallet.`);
    }
    if (codes.includes("op_too_few_offers")) {
      throw new Error(`Not enough liquidity to pay in ${asset.code} right now.`);
    }
    throw new Error(codes.length ? `Payment failed: ${codes.join(", ")}` : String(e));
  }
}
