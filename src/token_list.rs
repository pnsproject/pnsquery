/*!
```
query QueryDomains($skip: Int = 10) {
  domains(skip: $skip, first: 1000) {
    id
  }
}
```
*/

// generate by https://generator.cynic-rs.dev/
#[cynic::schema_for_derives(file = r#"schema.gql"#, module = "schema")]
mod queries {
    use super::schema;

    #[derive(cynic::QueryVariables, Debug)]
    pub struct QueryDomainsVariables {
        pub skip: Option<i32>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    #[cynic(graphql_type = "Query", variables = "QueryDomainsVariables")]
    pub struct QueryDomains {
        #[arguments(skip: $skip, first: 1000)]
        pub domains: Vec<Domain>,
    }

    #[derive(cynic::QueryFragment, Debug)]
    pub struct Domain {
        pub id: Bytes,
    }

    #[derive(cynic::Scalar, Debug, Clone)]
    pub struct Bytes(pub String);
}

#[allow(non_snake_case, non_camel_case_types)]
mod schema {
    cynic::use_schema!(r#"schema.gql"#);
}

use crate::{BuildQuery, IsFull, DOMAIN_ID_LEN};

use self::queries::{QueryDomains, QueryDomainsVariables};

pub struct QueryTokenList;

impl BuildQuery for QueryTokenList {
    type Vars = QueryDomainsVariables;

    type ResponseData = QueryDomains;

    fn build_query(offset: i32) -> cynic::Operation<Self::ResponseData, Self::Vars> {
        <queries::QueryDomains as cynic::QueryBuilder>::build(queries::QueryDomainsVariables {
            skip: Some(offset),
        })
    }
}

impl IsFull for QueryDomains {
    type Item = String;

    fn len(&self) -> usize {
        self.domains.len()
    }

    fn into_iter(self) -> impl IntoIterator<Item = Self::Item> {
        IntoIterator::into_iter(self.domains)
            .map(|domain| crate::HandleId::handle_id::<DOMAIN_ID_LEN>(&domain.id.0))
    }
}
