#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, vec, Address, Bytes, BytesN, Env, String};

struct Setup<'a> {
    env: Env,
    client: LumenSplitClient<'a>,
    token: token::Client<'a>,
    ana: Address,
    ben: Address,
    carla: Address,
    group_id: u32,
}

fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin);
    let token_id = sac.address();
    let token_admin = StellarAssetClient::new(&env, &token_id);
    let token = token::Client::new(&env, &token_id);

    let ana = Address::generate(&env);
    let ben = Address::generate(&env);
    let carla = Address::generate(&env);
    for who in [&ana, &ben, &carla] {
        token_admin.mint(who, &1_000_0000000);
    }

    let contract_id = env.register(LumenSplit, ());
    let client = LumenSplitClient::new(&env, &contract_id);

    let group_id = client.create_group(
        &ana,
        &String::from_str(&env, "Lisbon trip"),
        &token_id,
        &vec![&env, ana.clone(), ben.clone(), carla.clone()],
    );

    Setup { env, client, token, ana, ben, carla, group_id }
}

#[test]
fn create_group_works() {
    let s = setup();
    assert_eq!(s.group_id, 1);
    assert_eq!(s.client.group_count(), 1);
    let g = s.client.get_group(&s.group_id);
    assert_eq!(g.members.len(), 3);
    let b = s.client.get_balances(&s.group_id);
    assert_eq!(b.get(s.ana.clone()), Some(0));
}

#[test]
fn expense_splits_equally_and_sums_to_zero() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    // Ana pays 90 for dinner shared by three.
    s.client.add_expense(&s.group_id, &s.ana, &90, &String::from_str(&s.env, "Dinner"), &all);

    let b = s.client.get_balances(&s.group_id);
    assert_eq!(b.get(s.ana.clone()), Some(60));
    assert_eq!(b.get(s.ben.clone()), Some(-30));
    assert_eq!(b.get(s.carla.clone()), Some(-30));
    assert_eq!(s.client.get_expenses(&s.group_id).len(), 1);
}

#[test]
fn remainder_is_distributed_so_ledger_balances() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    s.client.add_expense(&s.group_id, &s.ben, &100, &String::from_str(&s.env, "Taxi"), &all);

    let b = s.client.get_balances(&s.group_id);
    let total: i128 = b.values().iter().sum();
    assert_eq!(total, 0);
    assert_eq!(b.get(s.ana.clone()), Some(-34));
    assert_eq!(b.get(s.ben.clone()), Some(100 - 33));
    assert_eq!(b.get(s.carla.clone()), Some(-33));
}

#[test]
fn settle_moves_tokens_and_updates_ledger() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    s.client.add_expense(&s.group_id, &s.ana, &90, &String::from_str(&s.env, "Dinner"), &all);

    let ana_before = s.token.balance(&s.ana);
    let ben_before = s.token.balance(&s.ben);
    s.client.settle(&s.group_id, &s.ben, &s.ana, &30);

    assert_eq!(s.token.balance(&s.ana), ana_before + 30);
    assert_eq!(s.token.balance(&s.ben), ben_before - 30);

    let b = s.client.get_balances(&s.group_id);
    assert_eq!(b.get(s.ana.clone()), Some(30));
    assert_eq!(b.get(s.ben.clone()), Some(0));
}

#[test]
fn cannot_overpay_or_settle_without_debt() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    s.client.add_expense(&s.group_id, &s.ana, &90, &String::from_str(&s.env, "Dinner"), &all);

    assert_eq!(
        s.client.try_settle(&s.group_id, &s.ben, &s.ana, &31),
        Err(Ok(Error::AmountTooLarge))
    );
    assert_eq!(
        s.client.try_settle(&s.group_id, &s.ana, &s.ben, &10),
        Err(Ok(Error::NothingToSettle))
    );
}

#[test]
fn outsiders_are_rejected() {
    let s = setup();
    let stranger = Address::generate(&s.env);
    let res = s.client.try_add_expense(
        &s.group_id,
        &stranger,
        &50,
        &String::from_str(&s.env, "Snacks"),
        &vec![&s.env, s.ana.clone()],
    );
    assert_eq!(res, Err(Ok(Error::NotAMember)));
}

#[test]
fn suggested_settlements_clear_all_debts() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    s.client.add_expense(&s.group_id, &s.ana, &90, &String::from_str(&s.env, "Dinner"), &all);
    s.client.add_expense(&s.group_id, &s.ben, &30, &String::from_str(&s.env, "Coffee"), &all);
    s.client.add_expense(
        &s.group_id,
        &s.carla,
        &60,
        &String::from_str(&s.env, "Museum"),
        &vec![&s.env, s.ana.clone(), s.carla.clone()],
    );

    let plan = s.client.suggest_settlements(&s.group_id);
    assert!(plan.len() <= 2);
    for t in plan.iter() {
        s.client.settle(&s.group_id, &t.from, &t.to, &t.amount);
    }
    for (_, bal) in s.client.get_balances(&s.group_id).iter() {
        assert_eq!(bal, 0);
    }
}

// ---------- Phase 2: settle_all, invites, custom splits ----------

fn invite(s: &Setup, code: &str) -> Bytes {
    let code = Bytes::from_slice(&s.env, code.as_bytes());
    let hash: BytesN<32> = s.env.crypto().sha256(&code).into();
    s.client.create_invite(&s.group_id, &s.ana, &hash);
    code
}

#[test]
fn settle_all_pays_every_creditor_in_one_call() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    // Same story as the demo: ana +43, ben -59, carla +16.
    s.client.add_expense(&s.group_id, &s.ana, &90, &String::from_str(&s.env, "Dinner"), &all);
    s.client.add_expense(&s.group_id, &s.ben, &24, &String::from_str(&s.env, "Uber"), &all);
    s.client.add_expense(&s.group_id, &s.carla, &45, &String::from_str(&s.env, "Museum"), &all);
    s.client.add_expense(
        &s.group_id, &s.ana, &12, &String::from_str(&s.env, "Nata"),
        &vec![&s.env, s.ana.clone(), s.carla.clone()],
    );
    s.client.add_expense(
        &s.group_id, &s.carla, &60, &String::from_str(&s.env, "Fado"),
        &vec![&s.env, s.ben.clone(), s.carla.clone()],
    );

    let ben_before = s.token.balance(&s.ben);
    let done = s.client.settle_all(&s.group_id, &s.ben);

    assert_eq!(done.len(), 2);
    assert_eq!(s.token.balance(&s.ben), ben_before - 59);
    for (_, bal) in s.client.get_balances(&s.group_id).iter() {
        assert_eq!(bal, 0);
    }
}

#[test]
fn settle_all_without_debt_fails() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    s.client.add_expense(&s.group_id, &s.ana, &90, &String::from_str(&s.env, "Dinner"), &all);
    assert_eq!(
        s.client.try_settle_all(&s.group_id, &s.ana),
        Err(Ok(Error::NothingToSettle))
    );
}

#[test]
fn join_with_valid_invite() {
    let s = setup();
    let code = invite(&s, "secret-code-123");
    let dani = Address::generate(&s.env);

    s.client.join_group(&s.group_id, &dani, &code);

    assert!(s.client.get_group(&s.group_id).members.contains(&dani));
    assert_eq!(s.client.get_balances(&s.group_id).get(dani.clone()), Some(0));

    // The new member can take part in expenses right away.
    s.client.add_expense(
        &s.group_id, &dani, &40, &String::from_str(&s.env, "Drinks"),
        &vec![&s.env, dani.clone(), s.ana.clone()],
    );
    assert_eq!(s.client.get_balances(&s.group_id).get(dani), Some(20));
}

#[test]
fn join_rejects_bad_code_missing_invite_and_existing_member() {
    let s = setup();
    let dani = Address::generate(&s.env);
    let wrong = Bytes::from_slice(&s.env, b"nope");

    assert_eq!(
        s.client.try_join_group(&s.group_id, &dani, &wrong),
        Err(Ok(Error::NoInvite))
    );

    let code = invite(&s, "secret-code-123");
    assert_eq!(
        s.client.try_join_group(&s.group_id, &dani, &wrong),
        Err(Ok(Error::InvalidInvite))
    );
    assert_eq!(
        s.client.try_join_group(&s.group_id, &s.ben, &code),
        Err(Ok(Error::AlreadyMember))
    );
}

#[test]
fn only_members_can_create_invites() {
    let s = setup();
    let stranger = Address::generate(&s.env);
    let hash = BytesN::from_array(&s.env, &[7u8; 32]);
    assert_eq!(
        s.client.try_create_invite(&s.group_id, &stranger, &hash),
        Err(Ok(Error::NotAMember))
    );
}

#[test]
fn custom_split_uses_each_amount_and_sums_to_zero() {
    let s = setup();
    let shares = vec![
        &s.env,
        Share { member: s.ana.clone(), amount: 10 },
        Share { member: s.ben.clone(), amount: 35 },
        Share { member: s.carla.clone(), amount: 15 },
    ];
    s.client.add_expense_custom(&s.group_id, &s.ana, &String::from_str(&s.env, "Steak night"), &shares);

    let b = s.client.get_balances(&s.group_id);
    assert_eq!(b.get(s.ana.clone()), Some(50));
    assert_eq!(b.get(s.ben.clone()), Some(-35));
    assert_eq!(b.get(s.carla.clone()), Some(-15));

    let e = s.client.get_expenses(&s.group_id).get_unchecked(0);
    assert_eq!(e.amount, 60);
    assert_eq!(e.shares, vec![&s.env, 10i128, 35, 15]);
}

#[test]
fn custom_split_rejects_zero_duplicates_and_outsiders() {
    let s = setup();
    let desc = String::from_str(&s.env, "Bad");
    let zero = vec![&s.env, Share { member: s.ben.clone(), amount: 0 }];
    assert_eq!(
        s.client.try_add_expense_custom(&s.group_id, &s.ana, &desc, &zero),
        Err(Ok(Error::InvalidAmount))
    );
    let dup = vec![
        &s.env,
        Share { member: s.ben.clone(), amount: 5 },
        Share { member: s.ben.clone(), amount: 5 },
    ];
    assert_eq!(
        s.client.try_add_expense_custom(&s.group_id, &s.ana, &desc, &dup),
        Err(Ok(Error::DuplicateMember))
    );
    let outsider = vec![&s.env, Share { member: Address::generate(&s.env), amount: 5 }];
    assert_eq!(
        s.client.try_add_expense_custom(&s.group_id, &s.ana, &desc, &outsider),
        Err(Ok(Error::NotAMember))
    );
}

#[test]
fn equal_split_fills_shares() {
    let s = setup();
    let all = vec![&s.env, s.ana.clone(), s.ben.clone(), s.carla.clone()];
    s.client.add_expense(&s.group_id, &s.ben, &100, &String::from_str(&s.env, "Taxi"), &all);
    let e = s.client.get_expenses(&s.group_id).get_unchecked(0);
    assert_eq!(e.shares, vec![&s.env, 34i128, 33, 33]);
}
