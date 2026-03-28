use anyhow::Result;

pub async fn run(query: Option<String>, category: Option<String>) -> Result<()> {
    println!("Discovering OSP providers...\n");

    // In a full implementation, this would query the registry
    let registry = osp_provider::AdapterRegistry::new();
    let mut reg = registry;
    reg.register_defaults();

    let adapters = reg.list();

    if let Some(ref q) = query {
        println!("Search: {q}");
    }
    if let Some(ref cat) = category {
        println!("Category: {cat}");
    }

    println!("{:<20} {:<15} {:<10}", "Provider", "ID", "API Type");
    println!("{:-<50}", "");

    for adapter in &adapters {
        let api = match adapter.api_type {
            osp_provider::port::ApiType::Rest => "REST",
            osp_provider::port::ApiType::GraphQL => "GraphQL",
        };
        println!(
            "{:<20} {:<15} {:<10}",
            adapter.display_name, adapter.provider_id, api
        );
    }

    println!("\n{} providers available.", adapters.len());
    println!("Use `osp provision <provider/offering>` to add a service.");

    Ok(())
}
