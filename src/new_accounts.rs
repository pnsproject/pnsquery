/*!
```
query QueryAccounts($skip: Int = 10) {
  accounts(first: 1000, skip: $skip) {
    id
    domains(
      first: 1000
      where: {parent: "0x3fce7d1364a893e213bc4212792b517ffc88f5b13b86c8ef9c8d390c3a1370ce"}
    ) {
      name
      createdAt
    }
  }
}

query QueryDomains($skip: Int = 10, $id: ID = "") {
  account(id: $id) {
    domains(first: 1000, skip: $skip) {
      name
      createdAt
    }
  }
}
```
*/
/// 2022-11-08 20:00:00
const OLD_TIMESTAMP: i32 = 1667908800;
/// 2022-11-21 20:00:00
const NEW_TIMESTAMP: i32 = 1669032000;

#[cynic::schema_for_derives(file = r#"schema.gql"#, module = "schema")]
mod queries {
    use super::schema;

    #[derive(cynic::QueryVariables, Debug)]
    pub struct QueryAccountsVariables {
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryVariables, Debug)]
    pub struct QueryDomainsVariables {
        pub id: cynic::Id,
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "QueryAccountsVariables")]
    pub struct QueryAccounts {
        #[arguments(first: 1000, skip: $skip)]
        pub accounts: Vec<Account>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "QueryDomainsVariables")]
    pub struct QueryDomains {
        #[arguments(id: $id)]
        pub account: Option<Account2>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Account {
        pub id: Bytes,
        #[arguments(first: 1000, where: { parent: "0x3fce7d1364a893e213bc4212792b517ffc88f5b13b86c8ef9c8d390c3a1370ce" })]
        pub domains: Vec<Domain>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Account", variables = "QueryDomainsVariables")]
    pub struct Account2 {
        #[arguments(first: 1000, skip: $skip)]
        pub domains: Vec<Domain>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Domain {
        pub name: Option<String>,
        pub created_at: BigInt,
    }

    #[derive(cynic::Scalar, Debug, Clone)]
    pub struct BigInt(pub String);

    #[derive(cynic::Scalar, Debug, Clone)]
    pub struct Bytes(pub String);
}

#[allow(non_snake_case, non_camel_case_types)]
mod schema {
    cynic::use_schema!(r#"schema.gql"#);
}

use futures_util::{stream, Stream, StreamExt};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

use crate::{run_graphql, HandleId, IsFull, IsFullAsync, ACCOUNT_ID_LEN};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AllAccounts {
    old_accounts_num: usize,
    old_accounts: HashSet<Account>,
    new_accounts_num: usize,
    new_accounts: HashSet<Account>,
}

#[derive(Debug, Serialize, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    id: String,
    old_domains_num: usize,
    new_domains_num: usize,
    domains: HashMap<String, i32>,
}

impl PartialEq for Account {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl core::hash::Hash for Account {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

pub struct QueryNewDomainsBuilder;

impl QueryNewDomainsBuilder {
    fn build_query(
        offset: i32,
        id: cynic::Id,
    ) -> cynic::Operation<queries::QueryDomains, queries::QueryDomainsVariables> {
        <queries::QueryDomains as cynic::QueryBuilder>::build(queries::QueryDomainsVariables {
            skip: Some(offset),
            id,
        })
    }

    pub async fn query() -> AllAccounts {
        let mut is_full = true;
        let mut offset = 0;
        let mut old = HashSet::default();
        let mut new = HashSet::default();

        while is_full {
            let data = run_graphql(<queries::QueryAccounts as cynic::QueryBuilder>::build(
                queries::QueryAccountsVariables { skip: Some(offset) },
            ))
            .await
            .data
            .unwrap();
            offset += 1000;
            is_full = data.is_full();

            let mut stream = data.into_stream().await.boxed();

            while let Some(addr) = stream.next().await {
                if addr.old_domains_num == 0 {
                    new.insert(addr);
                } else {
                    old.insert(addr);
                }
            }
        }

        AllAccounts {
            old_accounts_num: old.len(),
            old_accounts: old,
            new_accounts_num: new.len(),
            new_accounts: new,
        }
    }
}

impl IsFull for queries::QueryDomains {
    type Item = HashMap<String, i32>;

    fn len(&self) -> usize {
        self.account
            .as_ref()
            .map(|a| a.domains.len())
            .unwrap_or_default()
    }

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item> {
        self.account
            .map(|a| {
                a.domains
                    .into_iter()
                    .filter_map(|d| {
                        let created_at = d.created_at.0.parse::<i32>().unwrap();

                        if created_at > NEW_TIMESTAMP {
                            return None;
                        }

                        Some((d.name.unwrap(), created_at))
                    })
                    .collect::<HashMap<_, _>>()
            })
            .into_iter()
    }
}

impl IsFullAsync for queries::QueryAccounts {
    type Item = Account;

    fn len(&self) -> usize {
        self.accounts.len()
    }

    async fn into_stream(self) -> impl Stream<Item = Self::Item> {
        stream::iter(self.accounts.into_iter()).filter_map(|account| async move {
            let domains_len = account.domains.len();
            let mut full = None;
            if domains_len == 1000 {
                let mut is_full = true;
                let mut offset = 1000;
                let mut res = Vec::default();

                while is_full {
                    let data = run_graphql(QueryNewDomainsBuilder::build_query(
                        offset,
                        cynic::Id::new(&account.id.0),
                    ))
                    .await
                    .data
                    .unwrap();
                    offset += 1000;
                    is_full = data.is_full();

                    res.extend(data.into_iter());
                }

                full.replace(res);
            }

            let mut domains = account
                .domains
                .into_iter()
                .filter_map(|d| {
                    let created_at = d.created_at.0.parse::<i32>().unwrap();

                    if created_at > NEW_TIMESTAMP {
                        return None;
                    }

                    Some((d.name.unwrap(), created_at))
                })
                .collect::<HashMap<_, _>>();
            if let Some(full) = full {
                full.into_iter().for_each(|set| domains.extend(set));
            }
            let domains_num = domains.len();

            if domains_num == 0 {
                return None;
            }

            Some(Account {
                id: account.id.0.handle_id::<ACCOUNT_ID_LEN>(),
                old_domains_num: domains.iter().filter(|(_, t)| **t <= OLD_TIMESTAMP).count(),
                new_domains_num: domains.iter().filter(|(_, t)| **t > OLD_TIMESTAMP).count(),
                domains,
            })
        })
    }
}
