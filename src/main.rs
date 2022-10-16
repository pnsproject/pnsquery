#![allow(incomplete_features)]
#![feature(return_position_impl_trait_in_trait)]

mod new_subdomains;
mod registrations;
mod token_list;

use std::collections::HashMap;

use cynic::Operation;
use serde::Serialize;
use tokio::io::AsyncWriteExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let token_list = query_all::<token_list::QueryTokenList>().await;

    let new_subdomain = query_all::<new_subdomains::NewSubdomainQueryBuilder>().await;

    println!("token_list len: {}", token_list.len());

    println!("new_subdomain len: {}", new_subdomain.len());

    let pns_info = PnsInfo {
        token_list,
        new_subdomain,
    };

    let pns_info_name = format!(
        "pns_info{}.json",
        time::OffsetDateTime::now_utc().unix_timestamp()
    );

    let mut file = tokio::fs::File::create(pns_info_name).await?;
    file.write_all(&serde_json::to_vec_pretty(&pns_info)?)
        .await?;

    let query_records = registrations::Records(
        IntoIterator::into_iter(query_all::<registrations::RecordsBuilder>().await)
            .collect::<HashMap<_, _>>(),
    );

    println!("records len:{}", query_records.0.len());

    let records_name = format!(
        "records{}.json",
        time::OffsetDateTime::now_utc().unix_timestamp()
    );

    let mut file = tokio::fs::File::create(records_name).await?;
    file.write_all(&serde_json::to_vec_pretty(&query_records)?)
        .await?;

    Ok(())
}

#[derive(Debug, Serialize)]
pub struct PnsInfo {
    token_list: Vec<String>,
    new_subdomain: Vec<new_subdomains::NewSubdomain>,
}

async fn run_graphql<ResponseData, Vars>(
    query: Operation<ResponseData, Vars>,
) -> cynic::GraphQlResponse<ResponseData>
where
    Vars: serde::Serialize,
    ResponseData: serde::de::DeserializeOwned + 'static,
{
    cynic::http::ReqwestExt::run_graphql(
        reqwest::Client::new()
            .post("https://moonbeamgraph.test-pns-link.com/subgraphs/name/graphprotocol/pns"),
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

async fn query_all<QueryBuilder>(
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

impl HandleId for cynic::Id {
    fn handle_id<const L: usize>(&self) -> String {
        let inner = self.inner();
        let len = inner.len();
        if len != L {
            let (prefix, data) = inner.split_at(2);
            String::from(prefix) + &String::from_iter(vec!['0'; L - len]) + data
        } else {
            inner.into()
        }
    }
}
