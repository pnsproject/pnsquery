use std::collections::HashMap;

use serde::Serialize;

use crate::{BuildQuery, IsFull};

use self::queries::Domain2;

#[cynic::schema_for_derives(file = r#"schema.gql"#, module = "schema")]
pub mod queries {
    use super::schema;

    #[derive(cynic::QueryVariables, Debug)]
    pub struct RegistrationsVariables {
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "RegistrationsVariables")]
    pub struct Registrations {
        #[arguments(first: 1000, skip: $skip)]
        pub registrations: Vec<Registration>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Registration {
        pub expiry_date: BigInt,
        pub origin: Option<Domain>,
        pub capacity: Option<BigInt>,
        pub domain: Option<Domain2>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Domain")]
    pub struct Domain2 {
        pub id: cynic::Id,
        pub subdomain_count: i32,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Domain {
        pub id: cynic::Id,
    }

    #[derive(cynic::Scalar, Debug, Clone)]
    pub struct BigInt(pub String);
}

mod schema {
    cynic::use_schema!(r#"schema.gql"#);
}

#[derive(Debug, Serialize)]
pub struct Record {
    pub origin: String,
    pub expire: i64,
    pub capacity: i64,
    pub children: i32,
}

#[derive(Debug, Serialize)]
pub struct Records(pub HashMap<String, Record>);

pub struct RecordsBuilder;

impl BuildQuery for RecordsBuilder {
    type Vars = queries::RegistrationsVariables;

    type ResponseData = queries::Registrations;

    fn build_query(offset: i32) -> cynic::Operation<Self::ResponseData, Self::Vars> {
        <queries::Registrations as cynic::QueryBuilder>::build(queries::RegistrationsVariables {
            skip: Some(offset),
        })
    }
}

impl IsFull for queries::Registrations {
    type Item = (String, Record);

    fn len(&self) -> usize {
        self.registrations.len()
    }

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item> {
        IntoIterator::into_iter(self.registrations).filter_map(|registration| {
            registration.domain.map(
                |Domain2 {
                     id,
                     subdomain_count,
                 }| {
                    (
                        crate::HandleId::handle_id::<66>(&id),
                        Record {
                            expire: registration.expiry_date.0.parse().unwrap(),
                            origin: crate::HandleId::handle_id::<66>(
                                &registration.origin.map(|origin| origin.id).unwrap_or(id),
                            ),
                            capacity: registration
                                .capacity
                                .map(|capacity| capacity.0.parse().unwrap())
                                .unwrap_or(100),
                            children: subdomain_count,
                        },
                    )
                },
            )
        })
    }
}
