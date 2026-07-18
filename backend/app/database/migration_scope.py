def include_threatstream_name(name, type_, parent_names) -> bool:
    if type_ == "schema":
        return name in {None, "public"}
    return parent_names.get("schema_name") in {None, "public"}
