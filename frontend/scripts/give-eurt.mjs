// Gives demo EURT to one testnet account (adds the trustline first).
// Run from frontend/:
//   ISSUER_SECRET=S... USER_SECRET=$(stellar keys show dani) node scripts/give-eurt.mjs [amount]
import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const issuer = Keypair.fromSecret(process.env.ISSUER_SECRET ?? "");
const user = Keypair.fromSecret(process.env.USER_SECRET ?? "");
const amount = process.argv[2] ?? "500";
const EURT = new Asset("EURT", issuer.publicKey());

async function submit(kp, op) {
  const account = await server.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: Networks.TESTNET })
    .addOperation(op)
    .setTimeout(120)
    .build();
  tx.sign(kp);
  try {
    await server.submitTransaction(tx);
  } catch (e) {
    throw new Error(JSON.stringify(e?.response?.data?.extras?.result_codes ?? e.message));
  }
}

const account = await server.loadAccount(user.publicKey());
const hasLine = account.balances.some((b) => b.asset_code === "EURT" && b.asset_issuer === issuer.publicKey());
if (!hasLine) await submit(user, Operation.changeTrust({ asset: EURT }));
await submit(issuer, Operation.payment({ destination: user.publicKey(), asset: EURT, amount }));
console.log(`Sent ${amount} EURT to ${user.publicKey()}`);
