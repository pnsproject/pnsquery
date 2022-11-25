use query::new_accounts::QueryNewDomainsBuilder;
use tokio::io::AsyncWriteExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let accounts = QueryNewDomainsBuilder::query().await;

    let all_accounts_name = format!(
        "all_new_accounts{}.json",
        time::OffsetDateTime::now_utc().unix_timestamp()
    );

    let mut file = tokio::fs::File::create(all_accounts_name).await?;

    file.write_all(&serde_json::to_vec_pretty(&accounts)?)
        .await?;

    Ok(())
}
