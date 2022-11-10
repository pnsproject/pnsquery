/*!
```
query QueryRegistrations($skip: Int = 10) {
  registrations(skip: $skip, first: 1000) {
    expiryDate
    origin {
      id
    }
    capacity
    domain {
      subdomainCount
      id
    }
  }
}
```
*/
#[cynic::schema_for_derives(file = r#"schema.gql"#, module = "schema")]
mod queries {
    use super::schema;

    #[derive(cynic::QueryVariables, Debug)]
    pub struct QueryRegistrationsVariables {
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "QueryRegistrationsVariables")]
    pub struct QueryRegistrations {
        #[arguments(skip: $skip, first: 1000)]
        pub registrations: Vec<Registration>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Registration {
        pub expiry_date: Option<BigInt>,
        pub origin: Option<Domain>,
        pub capacity: Option<BigInt>,
        pub domain: Domain2,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Domain")]
    pub struct Domain2 {
        pub subdomain_count: i32,
        pub id: Bytes,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Domain {
        pub id: Bytes,
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

use std::collections::HashMap;

use serde::Serialize;

use crate::{BuildQuery, IsFull, DOMAIN_ID_LEN};

use self::queries::Domain2;

#[derive(Debug, Serialize)]
pub struct Record {
    pub origin: String,
    pub expire: Option<i64>,
    pub capacity: i64,
    pub children: i32,
}

#[derive(Debug, Serialize)]
pub struct Records(pub HashMap<String, Record>);

pub struct RecordsBuilder;

impl BuildQuery for RecordsBuilder {
    type Vars = queries::QueryRegistrationsVariables;

    type ResponseData = queries::QueryRegistrations;

    fn build_query(offset: i32) -> cynic::Operation<Self::ResponseData, Self::Vars> {
        <queries::QueryRegistrations as cynic::QueryBuilder>::build(
            queries::QueryRegistrationsVariables { skip: Some(offset) },
        )
    }
}

impl IsFull for queries::QueryRegistrations {
    type Item = (String, Record);

    fn len(&self) -> usize {
        self.registrations.len()
    }

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item> {
        IntoIterator::into_iter(self.registrations).map(|registration| {
            let Domain2 {
                id,
                subdomain_count,
            } = registration.domain;
            (
                crate::HandleId::handle_id::<DOMAIN_ID_LEN>(&id.0),
                Record {
                    expire: registration.expiry_date.and_then(|d| d.0.parse().ok()),
                    origin: crate::HandleId::handle_id::<DOMAIN_ID_LEN>(
                        &registration
                            .origin
                            .map(|origin| origin.id.0)
                            .unwrap_or(id.0),
                    ),
                    capacity: registration
                        .capacity
                        .map(|capacity| capacity.0.parse().unwrap())
                        .unwrap_or(100),
                    children: subdomain_count,
                },
            )
        })
    }
}
