use query::{new_subdomains, query_all, token_list};
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

    Ok(())
}

#[derive(Debug, serde::Serialize)]
pub struct PnsInfo {
    token_list: Vec<String>,
    new_subdomain: Vec<new_subdomains::NewSubdomain>,
}
