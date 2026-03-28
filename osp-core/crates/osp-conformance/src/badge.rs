use crate::levels::ConformanceLevel;
use crate::report::ConformanceReport;

/// Generate an SVG badge for a conformance report.
pub fn generate_badge(report: &ConformanceReport) -> String {
    let (label, color) = match &report.level_achieved {
        Some(ConformanceLevel::Full) => ("Full", "#4c1"),
        Some(ConformanceLevel::Escrow) => ("Escrow", "#97ca00"),
        Some(ConformanceLevel::Events) => ("Events", "#a4a61d"),
        Some(ConformanceLevel::Webhooks) => ("Webhooks", "#dfb317"),
        Some(ConformanceLevel::Core) => ("Core", "#fe7d37"),
        None => ("None", "#e05d44"),
    };

    let pass_rate = format!("{:.0}%", report.summary.pass_rate);
    let text = format!("OSP {label}");

    let label_width = text.len() * 7 + 10;
    let value_width = pass_rate.len() * 7 + 10;
    let total_width = label_width + value_width;
    let label_x = label_width / 2;
    let value_x = label_width + value_width / 2;

    let mut svg = String::new();
    svg.push_str(&format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{total_width}\" height=\"20\" role=\"img\">\n"
    ));
    svg.push_str(&format!(
        "  <title>OSP Conformance: {label} ({pass_rate})</title>\n"
    ));
    svg.push_str("  <linearGradient id=\"s\" x2=\"0\" y2=\"100%\">\n");
    svg.push_str("    <stop offset=\"0\" stop-color=\"#bbb\" stop-opacity=\".1\"/>\n");
    svg.push_str("    <stop offset=\"1\" stop-opacity=\".1\"/>\n");
    svg.push_str("  </linearGradient>\n");
    svg.push_str("  <clipPath id=\"r\">\n");
    svg.push_str(&format!(
        "    <rect width=\"{total_width}\" height=\"20\" rx=\"3\" fill=\"#fff\"/>\n"
    ));
    svg.push_str("  </clipPath>\n");
    svg.push_str("  <g clip-path=\"url(#r)\">\n");
    svg.push_str(&format!(
        "    <rect width=\"{label_width}\" height=\"20\" fill=\"#555\"/>\n"
    ));
    svg.push_str(&format!(
        "    <rect x=\"{label_width}\" width=\"{value_width}\" height=\"20\" fill=\"{color}\"/>\n"
    ));
    svg.push_str(&format!(
        "    <rect width=\"{total_width}\" height=\"20\" fill=\"url(#s)\"/>\n"
    ));
    svg.push_str("  </g>\n");
    svg.push_str("  <g fill=\"#fff\" text-anchor=\"middle\" font-family=\"Verdana,Geneva,sans-serif\" font-size=\"11\">\n");
    svg.push_str(&format!(
        "    <text x=\"{label_x}\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">{text}</text>\n"
    ));
    svg.push_str(&format!(
        "    <text x=\"{label_x}\" y=\"14\">{text}</text>\n"
    ));
    svg.push_str(&format!(
        "    <text x=\"{value_x}\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">{pass_rate}</text>\n"
    ));
    svg.push_str(&format!(
        "    <text x=\"{value_x}\" y=\"14\">{pass_rate}</text>\n"
    ));
    svg.push_str("  </g>\n");
    svg.push_str("</svg>");

    svg
}

/// Save a badge SVG to a file.
pub fn save_badge(report: &ConformanceReport, path: &std::path::Path) -> Result<(), std::io::Error> {
    let svg = generate_badge(report);
    std::fs::write(path, svg)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::levels::ConformanceLevel;
    use crate::report::{ConformanceReport, ReportSummary, TargetType};

    #[test]
    fn generates_valid_svg() {
        let report = ConformanceReport {
            target: "test.example.com".to_string(),
            target_type: TargetType::Provider,
            level_tested: ConformanceLevel::Core,
            level_achieved: Some(ConformanceLevel::Core),
            results: vec![],
            summary: ReportSummary {
                total: 8,
                passed: 8,
                failed: 0,
                skipped: 0,
                pass_rate: 100.0,
            },
            generated_at: chrono::Utc::now(),
        };

        let svg = generate_badge(&report);
        assert!(svg.starts_with("<svg"));
        assert!(svg.contains("OSP Core"));
        assert!(svg.contains("100%"));
    }
}
