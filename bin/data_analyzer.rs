use std::collections::HashSet;

use query::accouts::AllAccounts;
use tokio::io::AsyncWriteExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let before = tokio::fs::read_to_string("./all_accounts1668091204.json")
        .await
        .expect("not found before file.");
    let after = tokio::fs::read_to_string("./all_accounts1669365039.json")
        .await
        .expect("not found after file.");

    let before = serde_json::from_str::<AllAccounts>(&before)?;
    let after = serde_json::from_str::<AllAccounts>(&after)?;

    let mut surplus = HashSet::new();

    for a in before.accounts.iter() {
        if !after.accounts.contains(&a) {
            surplus.insert(a.clone());
        }
    }

    for a in after.accounts.into_iter() {
        if !before.accounts.contains(&a) {
            surplus.insert(a);
        }
    }

    let mut all = HashSet::new();

    for a in surplus.into_iter() {
        for d in a.domains {
            if let Some(d) = all.replace(d) {
                all.remove(&d);
            }
        }
    }

    // let accounts = AllAccounts {
    //     accounts_num: surplus.len(),
    //     accounts: surplus,
    // };

    let surplus_accounts_name = format!(
        "surplus_accounts{}.json",
        time::OffsetDateTime::now_utc().unix_timestamp()
    );

    let mut file = tokio::fs::File::create(surplus_accounts_name).await?;
    file.write_all(&serde_json::to_vec_pretty(&all)?).await?;

    Ok(())
}
