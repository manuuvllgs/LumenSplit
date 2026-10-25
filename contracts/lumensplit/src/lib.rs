#![no_std]
//! LumenSplit — split group expenses among friends and settle debts on Stellar.
//!
//! Each group keeps an on-chain ledger of who paid what. Balances are tracked
//! in the group's settlement token (e.g. USDC or XLM through its Stellar Asset
//! Contract). A positive balance means the member is owed money; a negative
//! balance means the member owes money. `settle` moves real tokens between
//! members and updates the ledger atomically.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    Map, String, Vec,
};

// Storage lifetime: new entries get the network's minimum TTL on creation.
// We do not extend TTL on every write, because rent is paid up front on each
// extension and that made group creation very expensive on testnet.

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    GroupNotFound = 1,
    NotAMember = 2,
    InvalidAmount = 3,
    NoParticipants = 4,
    EmptyGroup = 5,
    DuplicateMember = 6,
    NothingToSettle = 7,
    AmountTooLarge = 8,
    SelfSettlement = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Group {
    pub id: u32,
    pub name: String,
    pub token: Address,
    pub members: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Expense {
    pub payer: Address,
    pub amount: i128,
    pub description: String,
    pub participants: Vec<Address>,
    pub timestamp: u64,
}

/// A suggested transfer that helps clear the group's debts.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transfer {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    GroupCount,
    Group(u32),
    Balances(u32),
    Expenses(u32),
}

#[contractevent(topics = ["group_created"])]
pub struct GroupCreated {
    #[topic]
    pub group_id: u32,
    pub creator: Address,
}

#[contractevent(topics = ["expense_added"])]
pub struct ExpenseAdded {
    #[topic]
    pub group_id: u32,
    pub payer: Address,
    pub amount: i128,
}

#[contractevent(topics = ["settled"])]
pub struct Settled {
    #[topic]
    pub group_id: u32,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

#[contract]
pub struct LumenSplit;

#[contractimpl]
impl LumenSplit {
    /// Create a group. The creator must sign and be one of the members.
    /// `token` is the asset debts are settled in (e.g. the USDC SAC address).
    pub fn create_group(
        env: Env,
        creator: Address,
        name: String,
        token: Address,
        members: Vec<Address>,
    ) -> Result<u32, Error> {
        creator.require_auth();

        if members.is_empty() {
            return Err(Error::EmptyGroup);
        }
        for i in 0..members.len() {
            let m = members.get_unchecked(i);
            for j in (i + 1)..members.len() {
                if members.get_unchecked(j) == m {
                    return Err(Error::DuplicateMember);
                }
            }
        }
        if !members.contains(&creator) {
            return Err(Error::NotAMember);
        }

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GroupCount)
            .unwrap_or(0u32)
            + 1;
        env.storage().instance().set(&DataKey::GroupCount, &id);

        let mut balances: Map<Address, i128> = Map::new(&env);
        for m in members.iter() {
            balances.set(m, 0);
        }

        let group = Group {
            id,
            name,
            token,
            members,
        };
        Self::save(&env, &DataKey::Group(id), &group);
        Self::save(&env, &DataKey::Balances(id), &balances);
        Self::save(&env, &DataKey::Expenses(id), &Vec::<Expense>::new(&env));

        GroupCreated {
            group_id: id,
            creator,
        }
        .publish(&env);

        Ok(id)
    }

    /// Record an expense paid by `payer` and split equally among `participants`.
    /// Any remainder from the division goes to the first participants, one unit each,
    /// so the ledger always sums to exactly zero.
    pub fn add_expense(
        env: Env,
        group_id: u32,
        payer: Address,
        amount: i128,
        description: String,
        participants: Vec<Address>,
    ) -> Result<(), Error> {
        payer.require_auth();

        let group = Self::load_group(&env, group_id)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if participants.is_empty() {
            return Err(Error::NoParticipants);
        }
        if !group.members.contains(&payer) {
            return Err(Error::NotAMember);
        }
        for p in participants.iter() {
            if !group.members.contains(&p) {
                return Err(Error::NotAMember);
            }
        }

        let mut balances = Self::load_balances(&env, group_id)?;
        let n = participants.len() as i128;
        let share = amount / n;
        let remainder = amount % n;

        let paid = balances.get(payer.clone()).unwrap_or(0);
        balances.set(payer.clone(), paid + amount);

        for (i, p) in participants.iter().enumerate() {
            let extra = if (i as i128) < remainder { 1 } else { 0 };
            let owed = balances.get(p.clone()).unwrap_or(0);
            balances.set(p, owed - share - extra);
        }

        let mut expenses = Self::load_expenses(&env, group_id)?;
        expenses.push_back(Expense {
            payer: payer.clone(),
            amount,
            description,
            participants,
            timestamp: env.ledger().timestamp(),
        });

        Self::save(&env, &DataKey::Balances(group_id), &balances);
        Self::save(&env, &DataKey::Expenses(group_id), &expenses);

        ExpenseAdded {
            group_id,
            payer,
            amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Pay a debt: transfers `amount` of the group's token from `from` to `to`
    /// and updates the ledger. `from` must owe money and `to` must be owed money.
    pub fn settle(
        env: Env,
        group_id: u32,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();

        let group = Self::load_group(&env, group_id)?;
        if from == to {
            return Err(Error::SelfSettlement);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !group.members.contains(&from) || !group.members.contains(&to) {
            return Err(Error::NotAMember);
        }

        let mut balances = Self::load_balances(&env, group_id)?;
        let from_bal = balances.get(from.clone()).unwrap_or(0);
        let to_bal = balances.get(to.clone()).unwrap_or(0);

        if from_bal >= 0 || to_bal <= 0 {
            return Err(Error::NothingToSettle);
        }
        if amount > -from_bal || amount > to_bal {
            return Err(Error::AmountTooLarge);
        }

        token::Client::new(&env, &group.token).transfer(&from, &to, &amount);

        balances.set(from.clone(), from_bal + amount);
        balances.set(to.clone(), to_bal - amount);
        Self::save(&env, &DataKey::Balances(group_id), &balances);

        Settled {
            group_id,
            from,
            to,
            amount,
        }
        .publish(&env);

        Ok(())
    }

    pub fn get_group(env: Env, group_id: u32) -> Result<Group, Error> {
        Self::load_group(&env, group_id)
    }

    pub fn get_balances(env: Env, group_id: u32) -> Result<Map<Address, i128>, Error> {
        Self::load_balances(&env, group_id)
    }

    pub fn get_expenses(env: Env, group_id: u32) -> Result<Vec<Expense>, Error> {
        Self::load_expenses(&env, group_id)
    }

    pub fn group_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::GroupCount)
            .unwrap_or(0)
    }

    /// Debt simplification: the smallest practical list of transfers that
    /// leaves everyone at zero. Greedy match of the largest debtor with the
    /// largest creditor, which needs at most (members - 1) transfers.
    pub fn suggest_settlements(env: Env, group_id: u32) -> Result<Vec<Transfer>, Error> {
        let balances = Self::load_balances(&env, group_id)?;

        let mut debtors: Vec<(Address, i128)> = Vec::new(&env);
        let mut creditors: Vec<(Address, i128)> = Vec::new(&env);
        for (addr, bal) in balances.iter() {
            if bal < 0 {
                debtors.push_back((addr, -bal));
            } else if bal > 0 {
                creditors.push_back((addr, bal));
            }
        }

        let mut transfers: Vec<Transfer> = Vec::new(&env);
        loop {
            let d = Self::index_of_max(&debtors);
            let c = Self::index_of_max(&creditors);
            let (Some(di), Some(ci)) = (d, c) else { break };

            let (debtor, owes) = debtors.get_unchecked(di);
            let (creditor, owed) = creditors.get_unchecked(ci);
            let pay = if owes < owed { owes } else { owed };

            transfers.push_back(Transfer {
                from: debtor.clone(),
                to: creditor.clone(),
                amount: pay,
            });
            debtors.set(di, (debtor, owes - pay));
            creditors.set(ci, (creditor, owed - pay));
        }

        Ok(transfers)
    }
}

impl LumenSplit {
    fn index_of_max(list: &Vec<(Address, i128)>) -> Option<u32> {
        let mut best: Option<(u32, i128)> = None;
        for (i, (_, v)) in list.iter().enumerate() {
            if v > 0 && best.map_or(true, |(_, b)| v > b) {
                best = Some((i as u32, v));
            }
        }
        best.map(|(i, _)| i)
    }

    fn save<V: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(env: &Env, key: &DataKey, value: &V) {
        env.storage().persistent().set(key, value);
    }

    fn load_group(env: &Env, id: u32) -> Result<Group, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Group(id))
            .ok_or(Error::GroupNotFound)
    }

    fn load_balances(env: &Env, id: u32) -> Result<Map<Address, i128>, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Balances(id))
            .ok_or(Error::GroupNotFound)
    }

    fn load_expenses(env: &Env, id: u32) -> Result<Vec<Expense>, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Expenses(id))
            .ok_or(Error::GroupNotFound)
    }
}

#[cfg(test)]
mod test;
