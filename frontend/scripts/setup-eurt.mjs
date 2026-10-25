// Creates a demo euro token (EURT) on Stellar testnet, opens an EURT/XLM
// liquidity pool on the native AMM, and gives EURT to the demo accounts.
// This lets LumenSplit users pay their debts in euros while the group
// settles in XLM, via a path payment through the pool.
//
// Run from frontend/:
//   BEN_SECRET=$(stellar keys show ben) \
//   CARLA_SECRET=$(stellar keys show carla) \
//   ANA_SECRET=$(stellar keys show ana) \
//   node scripts/setup-eurt.mjs
//
// Optional: EXTRA_SECRETS="S...,S..." to also fund your own Freighter accounts.
import {
  Asset,
  Horizon,
  Keypair,
  LiquidityPoolAsset,
  LiquidityPoolFeeV18,
  Networks,
  Operation,
  TransactionBuilder,
  getLiquidityPoolId,
} from "@stellar/stellar-sdk";

const HORIZON = "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";
const server = new Horizon.Server(HORIZON);
const PASSPHRASE = Networks.TESTNET;

// Pool price: 1 EURT = 4 XLM.
const POOL_XLM = "8000";
const POOL_EURT = "2000";
const EURT_PER_USER = "500";

async function fund(kp, label) {
  const res = await fetch(`${FRIENDBOT}?addr=${kp.publicKey()}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${label}: ${await res.text()}`);
  console.log(`  funded ${label}: ${kp.publicKey()}`);
}

async function submit(sourceKp, ops, extraSigners = []) {
  const account = await server.loadAccount(sourceKp.publicKey());
  const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: PASSPHRASE })
    .setTimeout(120);
  ops.forEach((op) => tx.addOperation(op));
  const built = tx.build();
  built.sign(sourceKp, ...extraSigners);
  try {
    const res = await server.submitTransaction(built);
    return res.hash;
  } catch (e) {
    const codes = e?.response?.data?.extras?.result_codes;
    throw new Error(`Transaction failed: ${JSON.stringify(codes ?? e.message)}`);
  }
}

async function main() {
  const users = [
    ["ben", process.env.BEN_SECRET],
    ["carla", process.env.CARLA_SECRET],
    ["ana", process.env.ANA_SECRET],
    ...(process.env.EXTRA_SECRETS ?? "")
      .split(",")
      .filter(Boolean)
      .map((s, i) => [`extra${i + 1}`, s.trim()]),
  ].filter(([, s]) => s);
  if (users.length === 0) throw new Error("Pass at least BEN_SECRET (see header).");

  console.log("1) Creating issuer and liquidity provider accounts…");
  const issuer = Keypair.random();
  const lp = Keypair.random();
  await fund(issuer, "issuer");
  await fund(lp, "liquidity provider");

  const EURT = new Asset("EURT", issuer.publicKey());
  // Pool assets must be in canonical order: native first.
  const poolAsset = new LiquidityPoolAsset(Asset.native(), EURT, LiquidityPoolFeeV18);
  const poolId = Buffer.from(
    getLiquidityPoolId("constant_product", {
      assetA: Asset.native(),
      assetB: EURT,
      fee: LiquidityPoolFeeV18,
    }),
  ).toString("hex");

  console.log("2) Issuing EURT to the liquidity provider and opening the pool…");
  await submit(lp, [
    Operation.changeTrust({ asset: EURT }),
    Operation.changeTrust({ asset: poolAsset }),
  ]);
  await submit(issuer, [
    Operation.payment({ destination: lp.publicKey(), asset: EURT, amount: "100000" }),
  ]);
  await submit(lp, [
    Operation.liquidityPoolDeposit({
      liquidityPoolId: poolId,
      maxAmountA: POOL_XLM,
      maxAmountB: POOL_EURT,
      minPrice: "3.9",
      maxPrice: "4.1",
    }),
  ]);
  console.log(`  pool ${poolId}: ${POOL_XLM} XLM / ${POOL_EURT} EURT`);

  console.log(`3) Giving ${EURT_PER_USER} EURT to each demo account…`);
  for (const [label, secret] of users) {
    const kp = Keypair.fromSecret(secret);
    await submit(kp, [Operation.changeTrust({ asset: EURT })]);
    await submit(issuer, [
      Operation.payment({ destination: kp.publicKey(), asset: EURT, amount: EURT_PER_USER }),
    ]);
    console.log(`  ${label}: ${kp.publicKey()}`);
  }

  console.log("\n4) Checking a quote: how much EURT to deliver 43 XLM?");
  const quote = await server
    .strictReceivePaths([EURT], Asset.native(), "43")
    .call();
  const best = quote.records[0];
  console.log(`  ${best?.source_amount ?? "no path"} EURT -> 43 XLM`);

  console.log("\nDone. Add this to frontend/.env and .env.example:");
  console.log(`VITE_PAY_ASSET=EURT:${issuer.publicKey()}`);
  console.log("\nKeep the issuer secret only if you need to mint more EURT later:");
  console.log(`  ${issuer.secret()}`);
}

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
