use query::accouts::{AllAccountsClear, QueryDomainsBuilder};
use tokio::io::AsyncWriteExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let accounts = QueryDomainsBuilder::query().await;

    let accounts = AllAccountsClear::from_all_accounts(accounts);

    let all_accounts_name = format!(
        "accounts_clear{}.json",
        time::OffsetDateTime::now_utc().unix_timestamp()
    );

    let mut file = tokio::fs::File::create(all_accounts_name).await?;
    file.write_all(&serde_json::to_vec_pretty(&accounts)?)
        .await?;

    Ok(())
}
