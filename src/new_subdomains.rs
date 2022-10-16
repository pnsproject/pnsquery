use serde::Serialize;

use crate::{BuildQuery, HandleId, IsFull};

#[cynic::schema_for_derives(file = r#"schema.gql"#, module = "schema")]
pub mod queries {
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
        pub domain: Domain,
        pub parent_id: Domain,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Domain {
        pub id: cynic::Id,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Account {
        pub id: cynic::Id,
    }

    #[derive(cynic::InlineFragments, Debug)]
    pub enum DomainEvent {
        NewSubdomain(NewSubdomain),
        #[cynic(fallback)]
        Unknown,
    }
}

mod schema {
    cynic::use_schema!(r#"schema.gql"#);
}

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
                to: to.id.handle_id::<42>(),
                token_id: parent_id.id.handle_id::<66>(),
                subtoken_id: domain.id.handle_id::<66>(),
                name,
            }),
            queries::DomainEvent::Unknown => None,
        })
    }

    fn len(&self) -> usize {
        self.domain_events.len()
    }
}
