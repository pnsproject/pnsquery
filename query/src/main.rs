pub use queries::*;
use tokio::io::AsyncWriteExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let first = run_query(0).await.data.unwrap();
    let mut res = Vec::new();
    let first_subdomains = first.subdomains.unwrap();
    let mut total_count = first_subdomains.total_count;
    res.extend(first_subdomains.nodes);
    let mut offset = 0;
    while offset < total_count {
        offset += 100;
        let domains = run_query(offset).await.data.unwrap();
        let name_registered = domains.subdomains.unwrap();
        res.extend(name_registered.nodes);
        total_count = total_count.max(name_registered.total_count);
        println!("{}/{}", offset.min(total_count), total_count);
    }
    let domains = res
        .into_iter()
        .filter_map(|subdomain| subdomain)
        .collect::<Vec<_>>();
    assert_eq!(domains.len() as i32, total_count);
    let file_name = format!(
        "domains{}.json",
        time::OffsetDateTime::now_utc().unix_timestamp()
    );
    let mut file = tokio::fs::File::create(file_name).await?;
    file.write_all(&serde_json::to_vec_pretty(&domains)?)
        .await?;
    Ok(())
}

async fn run_query(offset: i32) -> cynic::GraphQlResponse<Domains> {
    use cynic::http::ReqwestExt;
    use cynic::QueryBuilder;

    let query = Domains::build(DomainsVariables {
        offset: Some(offset),
        first: Some(100),
    });

    reqwest::Client::new()
        .post("http://localhost:3000")
        .run_graphql(query)
        .await
        .unwrap()
}
// generate by https://generator.cynic-rs.dev/
#[cynic::schema_for_derives(file = r#"../local.graphql"#, module = "schema")]
mod queries {
    use serde::Serialize;

    use super::schema;

    #[derive(cynic::QueryVariables, Debug)]
    pub struct DomainsVariables {
        pub first: Option<i32>,
        pub offset: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "DomainsVariables")]
    pub struct Domains {
        #[arguments(first: $first, offset: $offset)]
        pub subdomains: Option<SubdomainsConnection>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct SubdomainsConnection {
        pub total_count: i32,
        pub nodes: Vec<Option<Subdomain>>,
    }

    #[derive(cynic::QueryFragment, Debug, Serialize)]
    pub struct Subdomain {
        pub id: String,
        pub name: Option<String>,
        pub owner: Option<String>,
        pub parent: Option<String>,
    }
}

mod schema {
    cynic::use_schema!(r#"../local.graphql"#);
}
