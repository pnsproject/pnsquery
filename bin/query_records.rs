use std::collections::HashMap;

use query::{query_all, registrations};
use tokio::io::AsyncWriteExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
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
