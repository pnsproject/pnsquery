use crate::{BuildQuery, IsFull};

use self::queries::{Domains, DomainsVariables};

// generate by https://generator.cynic-rs.dev/
#[cynic::schema_for_derives(file = r#"schema.gql"#, module = "schema")]
pub mod queries {
    use serde::Serialize;

    use super::schema;

    #[derive(cynic::QueryVariables, Debug)]
    pub struct DomainsVariables {
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "DomainsVariables")]
    pub struct Domains {
        #[arguments(first: 1000, skip: $skip)]
        pub domains: Vec<Domain>,
    }

    #[derive(cynic::QueryFragment, Debug, Serialize)]
    pub struct Domain {
        pub id: cynic::Id,
    }
}

mod schema {
    cynic::use_schema!(r#"schema.gql"#);
}

pub struct QueryTokenList;

impl BuildQuery for QueryTokenList {
    type Vars = DomainsVariables;

    type ResponseData = Domains;

    fn build_query(offset: i32) -> cynic::Operation<Self::ResponseData, Self::Vars> {
        <queries::Domains as cynic::QueryBuilder>::build(queries::DomainsVariables {
            skip: Some(offset),
        })
    }
}

impl IsFull for Domains {
    type Item = String;

    fn len(&self) -> usize {
        self.domains.len()
    }

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item> {
        IntoIterator::into_iter(self.domains)
            .map(|domain| crate::HandleId::handle_id::<66>(&domain.id))
    }
}
