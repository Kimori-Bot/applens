# AppLens Finance Plan

**Finance Lead:** Sub-agent  
**Date:** February 2026  
**Document Status:** Initial Draft

---

## 1. Executive Summary

AppLens is an SDK for AI-powered mobile app review testing. This document outlines pricing strategy, financial projections, and payment infrastructure recommendations based on competitor analysis and unit economics.

**Key Assumptions:**
- Primary market: Mobile app developers and QA teams
- Target customers: Startups to Enterprise
- Core value proposition: AI-powered review analysis (vs. manual or traditional automation)

---

## 2. Competitor Pricing Analysis

| Competitor | Type | Entry Price | Mid-Tier | Enterprise |
|------------|------|-------------|----------|------------|
| **BrowserStack** | SaaS | $12.50/mo (basic) | $150/mo (Team) | Custom |
| **Sauce Labs** | SaaS | $39/mo (Live) | $199/mo (Real Device) | Custom |
| **Kobiton** | SaaS | $83/mo (500 mins) | $399/mo (3000 mins) | Custom |
| **Appium** | Open Source | Free | Free | Free |
| **Detox** | Open Source | Free | Free | Free |

### Key Insights:
- **Market range:** $12–$400/month for SMB plans
- **Pricing model:** Primarily usage-based (minutes/parallel tests) or per-seat
- **Enterprise:** All major players require contact sales for custom pricing
- **Open-source alternatives:** Appium and Detox dominate the free tier, but require significant setup expertise

### AppLens Positioning:
AppLens should position as **premium but accessible** — offering AI-powered review analysis that competitors lack, at a competitive price point to Sauce Labs/Kobiton.

---

## 3. Proposed Pricing Tiers

### Tier Overview

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Price** | $0 | $49/mo | Custom |
| **Reviews/month** | 10 | 500 | Unlimited |
| **AI Analysis** | Basic | Advanced | Advanced + Custom |
| **API Access** | ❌ | ✅ | ✅ |
| **Team Seats** | 1 | 5 | Unlimited |
| **Support** | Community | Email | Dedicated CSM |
| **Custom Integrations** | ❌ | ❌ | ✅ |
| **SLA** | ❌ | 99.5% | 99.9% |

### Detailed Tier Breakdown

#### � free Tier
- **Price:** Free forever
- **Purpose:** Lead generation, developer onboarding
- **Includes:**
  - 10 reviews/month
  - Basic bug detection
  - Community support (Discord/GitHub)
  - SDK access

#### ⚡ Pro Tier
- **Price:** $49/month (billed annually) | $59/month (monthly)
- **Purpose:** Main revenue driver for SMBs and startups
- **Includes:**
  - 500 reviews/month
  - Advanced AI analysis (crash prediction, performance insights)
  - API access with rate limits
  - 5 team seats
  - Email support with 24h response
  - Basic integrations (Jira, Slack)

#### 🏢 Enterprise Tier
- **Price:** Starting at $499/month (custom quote)
- **Purpose:** Large teams, compliance-heavy industries
- **Includes:**
  - Unlimited reviews
  - Custom AI models/trained on company data
  - Unlimited team seats
  - Dedicated Customer Success Manager
  - SSO/SAML
  - Custom integrations
  - 99.9% SLA
  - On-premise deployment option
  - Phone support

### Pay-Per-Review Model (Optional Add-on)

For customers who want flexibility:

- **$0.15 per review** (on top of Pro tier)
- Ideal for: Agencies, sporadic usage
- Capped at 2x monthly tier limit

---

## 4. Financial Projections

### Assumptions

| Metric | Value | Source |
|--------|-------|--------|
| Average Pro ARPU | $49/mo | Proposed pricing |
| Enterprise ACV | $12,000/yr | Industry benchmark (~$1k/mo minimum) |
| CAC (Customer Acquisition Cost) | $150 | SaaS benchmark |
| Churn Rate | 5%/month (SMB) | Industry average |
| Sales Cycle | 2 weeks (SMB), 3 months (Enterprise) | Industry benchmark |
| Year 1 Target Customers | 500 (SMB), 5 (Enterprise) | Conservative growth |

### Revenue Projections (3-Year)

#### Year 1
| Quarter | Pro Subs | Pro MRR | Enterprise | Enterprise ARR | Total MRR |
|---------|----------|---------|------------|----------------|-----------|
| Q1 | 50 | $2,450 | 1 | $1,000 | $3,450 |
| Q2 | 120 | $5,880 | 2 | $2,000 | $7,880 |
| Q3 | 200 | $9,800 | 3 | $3,000 | $12,800 |
| Q4 | 300 | $14,700 | 5 | $5,000 | $19,700 |

**Year 1 Total ARR:** ~$180K

#### Year 2
- Pro Subs: 800 (+167% YoY)
- Enterprise: 15 accounts
- **ARR Target:** $650K

#### Year 3
- Pro Subs: 2,000 (+150% YoY)
- Enterprise: 40 accounts
- **ARR Target:** $2M

### Break-Even Analysis

| Item | Cost |
|------|------|
| Infrastructure (hosting, AI compute) | $0.08/review |
| Customer Support (1 FTE) | $6,000/mo |
| Sales & Marketing (estimated) | $15,000/mo |
| **Monthly Break-Even** | ~$21,000 MRR |
| **Break-Even Point** | ~430 Pro subscribers |

---

## 5. Unit Economics

### Cost Per Review (Marginal Cost)

| Cost Component | Cost per Review |
|----------------|-----------------|
| AI API (LLM) | $0.04 |
| Compute/Hosting | $0.02 |
| Storage | $0.01 |
| Payment Processing | $0.02 |
| **Total COGS** | **$0.09** |

### Margin Analysis

| Tier | Price | COGS | Gross Margin |
|------|-------|------|--------------|
| Free | $0 | $0.09 | N/A (subsidized) |
| Pro | $49/mo (500 reviews) | $45/mo | 8% ⚠️ |
| Pro (effective) | $0.098/review | $0.09 | 8% ⚠️ |
| Enterprise | $499/mo | $45/mo | 91% |

### Issues & Recommendations

**Problem:** Pro tier at $49 for 500 reviews yields only 8% margin — too low.

**Recommended Fix:** Two options:

1. **Raise Pro to $79/mo** (500 reviews included)
   - Effective: $0.158/review
   - Margin: 43% — healthy

2. **Keep $49 but reduce included reviews to 200**
   - Effective: $0.245/review
   - Margin: 63%
   - Forces upsell to Enterprise for high-volume users

### Recommended Pricing (Revised)

| Tier | Price | Included | Effective/Review |
|------|-------|----------|-------------------|
| Free | $0 | 10/mo | — |
| **Pro** | **$79/mo** | **500/mo** | $0.158 |
| Enterprise | $499+/mo | Unlimited | ~$0.09 |

---

## 6. Payment Infrastructure

### Recommended: Stripe

**Why Stripe:**
- ✅ Best-in-class SaaS billing (subscriptions, proration, trials)
- ✅ Usage-based metering support (via Stripe Metered)
- ✅ Enterprise features (Invoicing, Purchase Orders)
- ✅ Low-code pricing page (Stripe Billing)
- ✅ Global payments (140+ countries)
- ✅ Revenue recovery (dunning, retries)

### Alternative Options

| Provider | Pros | Cons |
|----------|------|------|
| **Paddle** | Handles global tax (VAT), easier for EU | Less flexible, higher fees |
| **Chargebee** | Great for subscriptions, self-serve | Limited usage-based features |
| **LemonSqueezy** | Simple, developer-friendly | Less mature, fewer features |

### Stripe Integration Plan

1. **Products:**
   - Pro Monthly: $79/mo
   - Pro Annual: $790/yr (save ~17%)
   - Enterprise: Custom (manual invoice)

2. **Features to Enable:**
   - Free trial (14 days for Pro)
   - Usage-based billing (for overage)
   - Customer portal (self-serve cancellation/upgrades)
   - Revenue recovery (failed payment retries)
   - Tax collection (Stripe Tax)

3. **Estimated Fees:**
   - Processing: 2.9% + $0.30 per transaction
   - SaaS Billing: Included in processing
   - Expected monthly fees: ~$500–$1,500 (Year 1)

---

## 7. Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-------------|--------|------------|
| Low Pro margin | High | High | Adjust pricing to $79/mo |
| High churn | Medium | High | Focus on Enterprise, build integrations |
| Competition (free tools) | High | Medium | Emphasize AI differentiation |
| Infrastructure cost spikes | Medium | Medium | Set usage limits, monitor closely |

---

## 8. Next Steps

1. ✅ Finalize pricing with leadership
2. Set up Stripe account and configure products
3. Build usage tracking for review metering
4. Create pricing page and marketing materials
5. Plan Enterprise sales motion (outbound)

---

## Appendix: Quick Reference

### Final Recommended Pricing

```
Free      → $0/mo   (10 reviews)
Pro       → $79/mo  (500 reviews) or $790/yr
Enterprise→ $499+/mo (custom)
Overage   → $0.20/review (if usage-based)
```

### Key Metrics (Year 1 Targets)

- **ARR:** $180K
- **MRR Break-even:** ~$21,000
- **CAC Payback:** 6 months
- **Gross Margin (Pro):** 43%

---

*Document prepared for AppLens leadership. Subject to revision based on market feedback.*
