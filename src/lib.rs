#![allow(incomplete_features)]
#![feature(return_position_impl_trait_in_trait)]
#![feature(async_fn_in_trait)]

pub mod accouts;
pub mod new_accounts;
pub mod new_subdomains;
pub mod registrations;
pub mod token_list;

// use std::collections::HashMap;

use cynic::Operation;
use futures_util::Stream;

pub async fn run_graphql<ResponseData, Vars>(
    query: Operation<ResponseData, Vars>,
) -> cynic::GraphQlResponse<ResponseData>
where
    Vars: serde::Serialize,
    ResponseData: serde::de::DeserializeOwned + 'static,
{
    cynic::http::ReqwestExt::run_graphql(
        reqwest::Client::new().post("https://pns-graph.ddns.so/subgraphs/name/graphprotocol/pns"),
        query,
    )
    .await
    .unwrap()
}

pub trait BuildQuery {
    type Vars: serde::Serialize;
    type ResponseData: serde::de::DeserializeOwned + 'static + IsFull;

    fn build_query(offset: i32) -> Operation<Self::ResponseData, Self::Vars>;
}

pub trait IsFull {
    type Item: 'static;

    fn len(&self) -> usize;

    fn is_full(&self) -> bool {
        self.len() == 1000
    }

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item>;
}

pub trait IsFullAsync {
    type Item: 'static;

    fn len(&self) -> usize;

    fn is_full(&self) -> bool {
        self.len() == 1000
    }

    async fn into_stream(self) -> impl Stream<Item = Self::Item>;
}

pub async fn query_all<QueryBuilder>(
) -> Vec<<<QueryBuilder as BuildQuery>::ResponseData as IsFull>::Item>
where
    QueryBuilder: BuildQuery,
{
    let mut is_full = true;
    let mut offset = 0;
    let mut res = Vec::new();

    while is_full {
        let data = run_graphql(QueryBuilder::build_query(offset))
            .await
            .data
            .unwrap();
        offset += 1000;
        is_full = data.is_full();
        res.extend(data.into_iter());
    }

    res
}

pub trait HandleId {
    fn handle_id<const L: usize>(&self) -> String;
}

impl HandleId for String {
    fn handle_id<const L: usize>(&self) -> String {
        let len = self.len();
        if len != L {
            let (prefix, data) = self.split_at(2);
            String::from(prefix) + &String::from_iter(vec!['0'; L - len]) + data
        } else {
            self.into()
        }
    }
}

pub const ACCOUNT_ID_LEN: usize = 42;
pub const DOMAIN_ID_LEN: usize = 66;

pub const OFFSET: i32 = 500;
pub const FIRST: usize = 600;
