// Sets the display name of demo accounts on their own Stellar account
// (data entry "lumensplit.name", same as the app's "choose your name" screen).
// Run from frontend/:
//   ANA=$(stellar keys show ana) BEN=$(stellar keys show ben) \
//   CARLA=$(stellar keys show carla) DANI=$(stellar keys show dani) \
//   node scripts/set-names.mjs
import { Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const people = { Ana: process.env.ANA, Ben: process.env.BEN, Carla: process.env.CARLA, Dani: process.env.DANI };

for (const [name, secret] of Object.entries(people)) {
  if (!secret) continue;
  const kp = Keypair.fromSecret(secret);
  const account = await server.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.manageData({ name: "lumensplit.name", value: name }))
    .setTimeout(120)
    .build();
  tx.sign(kp);
  try {
    await server.submitTransaction(tx);
    console.log(`${name.padEnd(6)} ${kp.publicKey()}`);
  } catch (e) {
    console.error(`${name}: ${JSON.stringify(e?.response?.data?.extras?.result_codes ?? e.message)}`);
  }
}
