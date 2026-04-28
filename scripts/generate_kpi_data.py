import json
import random
from datetime import datetime, timedelta

def generate_data():
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 3, 31)
    total_days = (end_date - start_date).days
    points_per_kpi = 1000

    kpi_defs = [
        {"name": "Revenue Growth Rate", "unit": "%", "direction": "higher_is_better", "base": 6.0, "trend": 0.005, "noise": 1.5, "owners": ["ceo", "cfo"]},
        {"name": "Net Profit Margin", "unit": "%", "direction": "higher_is_better", "base": 20.0, "trend": 0.002, "noise": 1.0, "owners": ["ceo", "cfo"]},
        {"name": "Return on Invested Capital (ROIC)", "unit": "%", "direction": "higher_is_better", "base": 14.0, "trend": 0.001, "noise": 0.8, "owners": ["ceo", "cfo"]},
        {"name": "Earnings Per Share (EPS)", "unit": "USD", "direction": "higher_is_better", "base": 3.0, "trend": 0.001, "noise": 0.2, "owners": ["ceo", "cfo"]},
        {"name": "EBITDA Margin", "unit": "%", "direction": "higher_is_better", "base": 33.0, "trend": 0.003, "noise": 1.2, "owners": ["cfo"]},
        {"name": "Operating Cash Flow", "unit": "USD", "direction": "higher_is_better", "base": 1.1e9, "trend": 1e6, "noise": 5e7, "owners": ["cfo", "coo"]},
        {"name": "Free Cash Flow", "unit": "USD", "direction": "higher_is_better", "base": 9e8, "trend": 8e5, "noise": 4e7, "owners": ["cfo"]},
        {"name": "Cost-to-Income Ratio", "unit": "%", "direction": "lower_is_better", "base": 44.0, "trend": -0.005, "noise": 1.0, "owners": ["cfo", "coo"]},
        {"name": "Net Interest Margin", "unit": "%", "direction": "higher_is_better", "base": 3.5, "trend": 0.0005, "noise": 0.1, "owners": ["cfo"]},
        {"name": "Provision for Credit Losses", "unit": "USD", "direction": "lower_is_better", "base": 1.6e8, "trend": 2e5, "noise": 1e7, "owners": ["cfo", "cro"]},
        {"name": "Net Charge-Off Rate", "unit": "%", "direction": "lower_is_better", "base": 2.3, "trend": 0.001, "noise": 0.2, "owners": ["cfo", "cro"]},
        {"name": "Delinquency Rate", "unit": "%", "direction": "lower_is_better", "base": 1.6, "trend": 0.0005, "noise": 0.15, "owners": ["cro"]},
        {"name": "Customer Acquisition Cost (CAC)", "unit": "USD", "direction": "lower_is_better", "base": 200, "trend": -0.05, "noise": 15, "owners": ["cmo"]},
        {"name": "Customer Lifetime Value (CLV)", "unit": "USD", "direction": "higher_is_better", "base": 4200, "trend": 1.0, "noise": 100, "owners": ["cmo"]},
        {"name": "Customer Retention Rate", "unit": "%", "direction": "higher_is_better", "base": 90.0, "trend": 0.005, "noise": 0.5, "owners": ["cmo"]},
        {"name": "Average Revenue per User/Card (ARPU)", "unit": "USD", "direction": "higher_is_better", "base": 440, "trend": 0.1, "noise": 10, "owners": ["cmo", "ceo"]},
        {"name": "Net Promoter Score (NPS)", "unit": "index", "direction": "higher_is_better", "base": 60, "trend": 0.02, "noise": 3, "owners": ["ceo", "cmo"]},
        {"name": "Digital Adoption Rate", "unit": "%", "direction": "higher_is_better", "base": 80.0, "trend": 0.01, "noise": 1.0, "owners": ["cio_cdo", "ceo"]},
        {"name": "Employee Engagement Score", "unit": "index", "direction": "higher_is_better", "base": 75, "trend": 0.005, "noise": 2, "owners": ["chro", "ceo"]},
        {"name": "Voluntary Attrition Rate", "unit": "%", "direction": "lower_is_better", "base": 10.0, "trend": -0.002, "noise": 1.0, "owners": ["chro"]}
    ]

    personas_meta = {
        "ceo": {"title": "Chief Executive Officer", "objectives": ["Profitable growth", "Market share", "Customer loyalty"]},
        "cfo": {"title": "Chief Financial Officer", "objectives": ["Capital efficiency", "Expense management", "Liquidity optimization"]},
        "cro": {"title": "Chief Risk Officer", "objectives": ["Portfolio quality", "Loss mitigation", "Economic capital"]},
        "cmo": {"title": "Chief Marketing Officer", "objectives": ["Brand equity", "New account growth", "Product upsell"]},
        "coo": {"title": "Chief Operating Officer", "objectives": ["Operational uptime", "Process automation", "Cost control"]},
        "cio_cdo": {"title": "CIO/CDO (Technology & Digital)", "objectives": ["Innovation", "System resiliency", "Digital transformation"]},
        "chro": {"title": "Chief HR Officer", "objectives": ["Talent density", "Workforce productivity", "Diversity & Inclusion"]}
    }

    result = {
        "organization": {
            "name": "Sample Bank Corp",
            "industry": "Banking / Card Issuer",
            "period": "High Volume Simulation (2025-2026)"
        },
        "personas": []
    }

    for p_id, meta in personas_meta.items():
        persona_obj = {
            "id": p_id,
            "title": meta["title"],
            "primaryObjectives": meta["objectives"],
            "kpis": []
        }
        
        # Filter KPIs owned by this persona
        for kpi_def in kpi_defs:
            if p_id in kpi_def["owners"]:
                kpi_obj = {
                    "name": kpi_def["name"],
                    "description": f"High resolution simulation for {kpi_def['name']}.",
                    "formula": "Generated via trend + noise model",
                    "unit": kpi_def["unit"],
                    "direction": kpi_def["direction"],
                    "ownerPersonas": kpi_def["owners"],
                    "targets": {
                        "targetValue": kpi_def["base"] * 1.1 if kpi_def["direction"] == "higher_is_better" else kpi_def["base"] * 0.9,
                        "warningThreshold": kpi_def["base"] * 0.9 if kpi_def["direction"] == "higher_is_better" else kpi_def["base"] * 1.1,
                        "criticalThreshold": kpi_def["base"] * 0.7 if kpi_def["direction"] == "higher_is_better" else kpi_def["base"] * 1.3
                    },
                    "sampleDataPoints": []
                }

                # Generate 1000 points
                for i in range(points_per_kpi):
                    seconds_offset = random.randint(0, total_days * 24 * 3600)
                    point_date = start_date + timedelta(seconds=seconds_offset)
                    
                    # Trend calculation based on days since start
                    days_since_start = (point_date - start_date).days
                    current_base = kpi_def["base"] + (kpi_def["trend"] * days_since_start)
                    
                    # Random noise
                    value = current_base + random.uniform(-kpi_def["noise"], kpi_def["noise"])
                    
                    # Status determination
                    status = "on_track"
                    if kpi_def["direction"] == "higher_is_better":
                        if value < kpi_obj["targets"]["criticalThreshold"]: status = "off_track"
                        elif value < kpi_obj["targets"]["warningThreshold"]: status = "watch"
                    else:
                        if value > kpi_obj["targets"]["criticalThreshold"]: status = "off_track"
                        elif value > kpi_obj["targets"]["warningThreshold"]: status = "watch"

                    kpi_obj["sampleDataPoints"].append({
                        "period": point_date.strftime("%Y-%m-%d %H:%M"),
                        "actualValue": round(value, 2),
                        "status": status
                    })
                
                # Sort points by date
                kpi_obj["sampleDataPoints"].sort(key=lambda x: x["period"])
                persona_obj["kpis"].append(kpi_obj)
        
        result["personas"].append(persona_obj)

    with open("data/persona_kpis_high_volume.json", "w") as f:
        json.dump(result, f, indent=2)

if __name__ == "__main__":
    generate_data()
    print("Successfully generated high volume data in data/persona_kpis_high_volume.json")
