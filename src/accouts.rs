/*!
```
query QueryAccounts($skip: Int = 10) {
    accounts(limit: 1000, offset: $skip) {
      id
      domains(
        limit: 1000
        where: {parent: {id_eq: "0x3fce7d1364a893e213bc4212792b517ffc88f5b13b86c8ef9c8d390c3a1370ce"}}
      ) {
        name
        createdAt
      }
    }
  }

  query QueryDomains($skip: Int = 10, $id: ID = "") {
    accountById(id: $id) {
      domains(limit: 1000, offset: $skip) {
        name
        createdAt
      }
    }
  }
```
*/
/// 2022-11-08 20:00:00
// const MAX_TIMESTAMP: i128 = 1671969600;
const MAX_TIMESTAMP: i128 = i128::MAX;

mod queries {
    use crate::schema;
    #[derive(cynic::QueryVariables, Debug)]
    pub struct QueryAccountsVariables {
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryVariables, Debug)]
    pub struct QueryDomainsVariables {
        pub id: String,
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "QueryAccountsVariables")]
    pub struct QueryAccounts {
        #[arguments(limit: 1000, offset: $skip)]
        pub accounts: Vec<Account>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "QueryDomainsVariables")]
    pub struct QueryDomains {
        #[arguments(id: $id)]
        pub account_by_id: Option<Account2>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Account {
        pub id: String,
        #[arguments(limit: 1000, where: { parent: { id_eq: "0x3fce7d1364a893e213bc4212792b517ffc88f5b13b86c8ef9c8d390c3a1370ce" } })]
        pub domains: Vec<Domain>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Account", variables = "QueryDomainsVariables")]
    pub struct Account2 {
        #[arguments(limit: 1000, offset: $skip)]
        pub domains: Vec<Domain>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Domain {
        pub name: Option<String>,
        pub created_at: BigInt,
    }

    #[derive(cynic::Scalar, Debug, Clone)]
    pub struct BigInt(pub String);
}

use cynic::QueryBuilder;
use futures_util::{stream, Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::{run_graphql, HandleId, IsFull, IsFullAsync, ACCOUNT_ID_LEN, FIRST, OFFSET};

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AllAccounts {
    pub accounts_num: usize,
    pub accounts: HashSet<PnsAccount>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AllAccountsClear {
    pub accounts_num: usize,
    pub accounts: HashSet<String>,
}

impl AllAccountsClear {
    pub fn from_all_accounts(all_accounts: AllAccounts) -> Self {
        let AllAccounts {
            accounts_num,
            accounts,
        } = all_accounts;

        Self {
            accounts_num,
            accounts: accounts
                .into_iter()
                .filter_map(|account| {
                    if account.domains_num > 0 {
                        Some(account.id)
                    } else {
                        None
                    }
                })
                .collect(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Eq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PnsAccount {
    id: String,
    domains_num: usize,
    pub domains: HashSet<String>,
}

impl PartialEq for PnsAccount {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl core::hash::Hash for PnsAccount {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

pub struct QueryDomainsBuilder;

impl QueryDomainsBuilder {
    fn build_query(
        offset: i32,
        id: String,
    ) -> cynic::Operation<queries::QueryDomains, queries::QueryDomainsVariables> {
        queries::QueryDomains::build(queries::QueryDomainsVariables {
            skip: Some(offset),
            id: id,
        })
    }

    pub async fn query() -> AllAccounts {
        let mut is_full = true;
        let mut offset = 0;
        let mut res = HashSet::default();

        while is_full {
            let data = run_graphql(queries::QueryAccounts::build(
                queries::QueryAccountsVariables { skip: Some(offset) },
            ))
            .await
            .data
            .unwrap();
            offset += OFFSET;
            is_full = data.is_full();

            res.extend(data.into_stream().await.collect::<HashSet<_>>().await);
        }

        AllAccounts {
            accounts_num: res.len(),
            accounts: res,
        }
    }
}

impl IsFull for queries::QueryDomains {
    type Item = HashSet<String>;

    fn len(&self) -> usize {
        self.account_by_id
            .as_ref()
            .map(|a| a.domains.len())
            .unwrap_or_default()
    }

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item> {
        self.account_by_id
            .map(|a| {
                a.domains
                    .into_iter()
                    .filter_map(|d| {
                        if d.created_at.0.parse::<i128>().unwrap() > MAX_TIMESTAMP {
                            return None;
                        }
                        d.name
                    })
                    .collect::<HashSet<_>>()
            })
            .into_iter()
    }
}

impl IsFullAsync for queries::QueryAccounts {
    type Item = PnsAccount;

    fn len(&self) -> usize {
        self.accounts.len()
    }

    async fn into_stream(self) -> impl Stream<Item = Self::Item> {
        stream::iter(self.accounts.into_iter()).filter_map(|account| async move {
            let domains_len = account.domains.len();
            let mut full = None;
            if domains_len == FIRST {
                let mut is_full = true;
                let mut offset = OFFSET;
                let mut res = Vec::default();

                while is_full {
                    let data =
                        run_graphql(QueryDomainsBuilder::build_query(offset, account.id.clone()))
                            .await
                            .data
                            .unwrap();
                    offset += OFFSET;
                    is_full = data.is_full();

                    res.extend(data.into_iter());
                }

                full.replace(res);
            }

            let mut domains = account
                .domains
                .into_iter()
                .filter_map(|d| {
                    if d.created_at.0.parse::<i128>().unwrap() > MAX_TIMESTAMP {
                        return None;
                    }
                    d.name
                })
                .collect::<HashSet<_>>();
            if let Some(full) = full {
                full.into_iter().for_each(|set| domains.extend(set));
            }
            let domains_num = domains.len();

            if domains_num == 0 {
                return None;
            }

            Some(PnsAccount {
                id: account.id.handle_id::<ACCOUNT_ID_LEN>(),
                domains_num: domains.len(),
                domains,
            })
        })
    }
}
