fn main() {
    cynic_codegen::register_schema("pns")
        .from_sdl_file("schema.gql")
        .unwrap()
        .as_default()
        .unwrap();
}
