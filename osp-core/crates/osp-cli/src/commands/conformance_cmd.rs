use anyhow::Result;
use osp_conformance::levels::ConformanceLevel;
use osp_conformance::report::{ConformanceReport, TargetType};

pub async fn run(target: &str, level: &str, output: Option<&str>) -> Result<()> {
    let conf_level = match level {
        "core" => ConformanceLevel::Core,
        "webhooks" => ConformanceLevel::Webhooks,
        "events" => ConformanceLevel::Events,
        "escrow" => ConformanceLevel::Escrow,
        "full" => ConformanceLevel::Full,
        other => anyhow::bail!("Unknown level: {other}. Use: core, webhooks, events, escrow, full"),
    };

    println!("Running OSP conformance tests against {target}");
    println!("Level: {}\n", conf_level.display_name());

    // Run provider tests
    let provider_results = osp_conformance::provider_tests::run_provider_tests(target).await?;

    // Run agent tests (local)
    let agent_results = osp_conformance::agent_tests::run_agent_tests();

    // Combine results
    let mut all_results = provider_results;
    all_results.extend(agent_results);

    // Build report
    let report = ConformanceReport::build(target, TargetType::Provider, conf_level, all_results);

    // Display results
    for result in &report.results {
        let icon = if result.is_passed() { "PASS" } else { "FAIL" };
        println!(
            "  [{icon}] {} ({}ms)",
            result.test_name, result.duration_ms
        );
        if let osp_conformance::report::TestStatus::Failed { ref reason } = result.status {
            println!("         {reason}");
        }
    }

    println!("\n{:-<60}", "");
    println!(
        "Results: {}/{} passed ({:.0}%)",
        report.summary.passed, report.summary.total, report.summary.pass_rate
    );

    if let Some(ref achieved) = report.level_achieved {
        println!("Level achieved: {}", achieved.display_name());
    } else {
        println!("Level achieved: None");
    }

    // Write report to file
    if let Some(output_path) = output {
        let json = report.to_json()?;
        std::fs::write(output_path, &json)?;
        println!("\nReport written to {output_path}");

        // Also generate badge
        let badge_path = output_path.replace(".json", ".svg");
        osp_conformance::badge::save_badge(&report, std::path::Path::new(&badge_path))?;
        println!("Badge written to {badge_path}");
    }

    Ok(())
}
