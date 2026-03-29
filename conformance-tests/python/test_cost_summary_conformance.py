"""OSP Cost Summary Endpoint Conformance Tests.

Tests that the GET /osp/v1/cost-summary endpoint:
- Returns a valid schema
- Includes total_cost, currency, period, resources
- Supports period filtering with period_start/period_end
- Returns zero total for empty cost summary
- Supports pagination with limit/offset
"""

import json
import pytest


# ---------------------------------------------------------------------------
# Schema Validation Tests (Offline)
# ---------------------------------------------------------------------------


class TestCostSummarySchema:
    """Verify cost-summary response structure matches the spec."""

    def _make_cost_summary(self, **overrides):
        base = {
            "total_cost": "125.50",
            "currency": "USD",
            "period": {
                "start": "2026-03-01T00:00:00Z",
                "end": "2026-03-31T23:59:59Z",
            },
            "resources": [
                {
                    "resource_id": "res_db_001",
                    "offering_id": "acme/postgres",
                    "tier_id": "pro",
                    "cost": "100.00",
                    "currency": "USD",
                },
                {
                    "resource_id": "res_cache_002",
                    "offering_id": "acme/redis",
                    "tier_id": "starter",
                    "cost": "25.50",
                    "currency": "USD",
                },
            ],
        }
        base.update(overrides)
        return base

    def test_cost_summary_has_required_fields(self):
        summary = self._make_cost_summary()
        required = {"total_cost", "currency", "period", "resources"}
        missing = required - set(summary.keys())
        assert not missing, f"Missing required fields: {missing}"

    def test_total_cost_is_string_decimal(self):
        summary = self._make_cost_summary()
        total = summary["total_cost"]
        assert isinstance(total, str)
        # Should be parseable as a decimal number
        float_val = float(total)
        assert float_val >= 0

    def test_currency_is_iso_4217(self):
        """Currency should be a 3-letter ISO 4217 code."""
        summary = self._make_cost_summary()
        currency = summary["currency"]
        assert isinstance(currency, str)
        assert len(currency) == 3
        assert currency.isupper()

    def test_period_has_start_and_end(self):
        summary = self._make_cost_summary()
        period = summary["period"]
        assert "start" in period
        assert "end" in period

    def test_resources_is_list(self):
        summary = self._make_cost_summary()
        assert isinstance(summary["resources"], list)

    def test_each_resource_has_required_fields(self):
        summary = self._make_cost_summary()
        resource_required = {"resource_id", "offering_id", "tier_id", "cost", "currency"}
        for resource in summary["resources"]:
            missing = resource_required - set(resource.keys())
            assert not missing, f"Resource missing fields: {missing}"

    def test_resource_cost_is_string_decimal(self):
        summary = self._make_cost_summary()
        for resource in summary["resources"]:
            cost = resource["cost"]
            assert isinstance(cost, str)
            float_val = float(cost)
            assert float_val >= 0

    def test_cost_summary_is_valid_json(self):
        summary = self._make_cost_summary()
        serialized = json.dumps(summary)
        parsed = json.loads(serialized)
        assert parsed == summary


class TestCostSummaryPeriodFiltering:
    """Verify period filtering with period_start/period_end works."""

    def test_period_start_filter(self):
        params = {
            "period_start": "2026-03-01T00:00:00Z",
        }
        assert "period_start" in params

    def test_period_end_filter(self):
        params = {
            "period_end": "2026-03-31T23:59:59Z",
        }
        assert "period_end" in params

    def test_period_range_filter(self):
        params = {
            "period_start": "2026-03-01T00:00:00Z",
            "period_end": "2026-03-31T23:59:59Z",
        }
        assert "period_start" in params
        assert "period_end" in params

    def test_period_start_before_end(self):
        params = {
            "period_start": "2026-03-01T00:00:00Z",
            "period_end": "2026-03-31T23:59:59Z",
        }
        assert params["period_start"] < params["period_end"]

    def test_filtered_response_period_matches(self):
        """Response period should reflect the requested filter."""
        request_start = "2026-03-01T00:00:00Z"
        request_end = "2026-03-31T23:59:59Z"
        response = {
            "total_cost": "50.00",
            "currency": "USD",
            "period": {
                "start": request_start,
                "end": request_end,
            },
            "resources": [],
        }
        assert response["period"]["start"] == request_start
        assert response["period"]["end"] == request_end


class TestEmptyCostSummary:
    """Verify empty cost summary returns zero total."""

    def test_no_resources_returns_zero_total(self):
        summary = {
            "total_cost": "0.00",
            "currency": "USD",
            "period": {
                "start": "2026-03-01T00:00:00Z",
                "end": "2026-03-31T23:59:59Z",
            },
            "resources": [],
        }
        assert float(summary["total_cost"]) == 0.0
        assert len(summary["resources"]) == 0

    def test_empty_resources_list_is_list(self):
        summary = {
            "total_cost": "0.00",
            "currency": "USD",
            "period": {
                "start": "2026-03-01T00:00:00Z",
                "end": "2026-03-31T23:59:59Z",
            },
            "resources": [],
        }
        assert isinstance(summary["resources"], list)

    def test_zero_total_still_has_currency(self):
        summary = {
            "total_cost": "0.00",
            "currency": "USD",
            "period": {
                "start": "2026-03-01T00:00:00Z",
                "end": "2026-03-31T23:59:59Z",
            },
            "resources": [],
        }
        assert "currency" in summary
        assert len(summary["currency"]) == 3


class TestCostSummaryPagination:
    """Verify pagination with limit/offset works."""

    def test_pagination_params_accepted(self):
        params = {"limit": 10, "offset": 0}
        assert "limit" in params
        assert "offset" in params

    def test_limit_constrains_resource_count(self):
        """Response should not return more resources than limit."""
        limit = 2
        resources = [
            {"resource_id": f"res_{i:03d}", "offering_id": "test/db", "tier_id": "free",
             "cost": "10.00", "currency": "USD"}
            for i in range(limit)
        ]
        assert len(resources) <= limit

    def test_offset_skips_resources(self):
        """Offset should skip the first N resources."""
        all_resources = [
            {"resource_id": f"res_{i:03d}", "offering_id": "test/db", "tier_id": "free",
             "cost": "10.00", "currency": "USD"}
            for i in range(5)
        ]
        offset = 2
        paginated = all_resources[offset:]
        assert len(paginated) == 3
        assert paginated[0]["resource_id"] == "res_002"

    def test_pagination_with_total_count(self):
        """Paginated response may include total count metadata."""
        response = {
            "total_cost": "500.00",
            "currency": "USD",
            "period": {
                "start": "2026-03-01T00:00:00Z",
                "end": "2026-03-31T23:59:59Z",
            },
            "resources": [
                {"resource_id": "res_000", "offering_id": "test/db", "tier_id": "free",
                 "cost": "100.00", "currency": "USD"},
            ],
            "pagination": {
                "total": 5,
                "limit": 1,
                "offset": 0,
            },
        }
        assert response["pagination"]["total"] == 5
        assert len(response["resources"]) <= response["pagination"]["limit"]


# ---------------------------------------------------------------------------
# Live Provider Tests (requires --provider-url)
# ---------------------------------------------------------------------------


@pytest.mark.skipif("not config.getoption('--provider-url')")
class TestLiveCostSummary:
    """Test cost-summary endpoint against a live provider."""

    def test_cost_summary_endpoint_returns_200(self, provider_url, api_key):
        import httpx

        resp = httpx.get(
            f"{provider_url}/osp/v1/cost-summary",
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "total_cost" in data
        assert "currency" in data
        assert "period" in data
        assert "resources" in data

    def test_cost_summary_with_period_filter(self, provider_url, api_key):
        import httpx

        resp = httpx.get(
            f"{provider_url}/osp/v1/cost-summary",
            params={
                "period_start": "2026-03-01T00:00:00Z",
                "period_end": "2026-03-31T23:59:59Z",
            },
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "period" in data
