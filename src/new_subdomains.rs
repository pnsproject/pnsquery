/*!
```
query QueryAccounts($skip: Int = 10,) {
  domainEvents(first: 1000, skip: $skip) {
    ... on NewSubdomain {
      name
      to {
        id
      }
      parentId {
        id
      }
      domain {
        id
      }
    }
  }
}
```
*/
#[cynic::schema_for_derives(file = r#"schema.gql"#, module = "schema")]
mod queries {
    use super::schema;

    #[derive(cynic::QueryVariables, Debug)]
    pub struct NewSubdomainsVariables {
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "NewSubdomainsVariables")]
    pub struct NewSubdomains {
        #[arguments(first: 1000, skip: $skip)]
        pub domain_events: Vec<DomainEvent>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct NewSubdomain {
        pub name: String,
        pub to: Account,
        pub parent_id: Domain,
        pub domain: Domain,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Domain {
        pub id: Bytes,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Account {
        pub id: Bytes,
    }

    #[derive(cynic::InlineFragments, Debug)]
    pub enum DomainEvent {
        NewSubdomain(NewSubdomain),
        #[cynic(fallback)]
        Unknown,
    }

    #[derive(cynic::Scalar, Debug, Clone)]
    pub struct Bytes(pub String);
}

#[allow(non_snake_case, non_camel_case_types)]
mod schema {
    cynic::use_schema!(r#"schema.gql"#);
}

use serde::Serialize;

use crate::{BuildQuery, HandleId, IsFull, ACCOUNT_ID_LEN, DOMAIN_ID_LEN};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSubdomain {
    to: String,
    token_id: String,
    subtoken_id: String,
    name: String,
}

pub struct NewSubdomainQueryBuilder;

impl BuildQuery for NewSubdomainQueryBuilder {
    type Vars = queries::NewSubdomainsVariables;

    type ResponseData = queries::NewSubdomains;

    fn build_query(offset: i32) -> cynic::Operation<Self::ResponseData, Self::Vars> {
        <queries::NewSubdomains as cynic::QueryBuilder>::build(queries::NewSubdomainsVariables {
            skip: Some(offset),
        })
    }
}

impl IsFull for queries::NewSubdomains {
    type Item = NewSubdomain;

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item> {
        IntoIterator::into_iter(self.domain_events).filter_map(|event| match event {
            queries::DomainEvent::NewSubdomain(queries::NewSubdomain {
                name,
                to,
                domain,
                parent_id,
            }) => Some(NewSubdomain {
                to: to.id.0.handle_id::<ACCOUNT_ID_LEN>(),
                token_id: parent_id.id.0.handle_id::<DOMAIN_ID_LEN>(),
                subtoken_id: domain.id.0.handle_id::<DOMAIN_ID_LEN>(),
                name,
            }),
            queries::DomainEvent::Unknown => None,
        })
    }

    fn len(&self) -> usize {
        self.domain_events.len()
    }
}
