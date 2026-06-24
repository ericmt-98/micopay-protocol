# Wave 6 — Validation results & SDF presentation prep

> **Purpose:** turn the answers from the research issues (V-1…V-5) into an aggregate,
> anonymized synthesis we can present to the **Stellar Development Foundation (SDF)** as
> evidence of real-world demand, supply, usability, and trust for a Stellar-based
> cash-in/cash-out network in emerging markets.
>
> Full issue text: [`WAVE6_RESEARCH_ISSUES.md`](./WAVE6_RESEARCH_ISSUES.md) ·
> Wave 6 plan: [`AUDIT_APK_WAVE6.md`](./AUDIT_APK_WAVE6.md).
>
> ⚠️ **Never copy personal data here.** Only patterns and counts. No amounts of money, no
> names, no contact info, no screenshots with sensitive data.

---

## The story we're proving for the SDF

A funding/grant case for MicoPay on Stellar rests on five claims. The research issues
each supply evidence for one of them:

| Claim | Backed by | One-line thesis |
|---|---|---|
| **1. Demand exists** | V-1 (cash-out) + V-2 (cash-in) | People have a real, recurring pain converting digital ↔ cash |
| **2. Supply exists** | V-3 (liquidity providers) | Real people/businesses would provide the cash for a commission |
| **3. Stellar is usable** | V-4 (non-custodial onboarding) | Mainstream users can handle a self-custodial Stellar wallet |
| **4. Trust / PMF** | V-5 (flow trust) | Users would actually adopt and complete the flow |
| **5. Differentiation** | V-7 (alternatives & switching) | Stellar P2P solves high fees, downtime, and limits of current options |

> Put together: **demand + supply + usable tech + trust + differentiation = a credible case that a Stellar P2P
> cash network serves the financially underserved.**

---

## Macro context (TAM — from public data, not from this survey)

The *size* of the problem comes from public sources; cite them in the deck. The survey adds
*willingness and trust*, which public data can't give. Approximate figures to verify and cite:

- Remittances to Mexico: ~US$60B+/year (cite World Bank / Banxico, latest year).
- Share of population unbanked / underbanked in Mexico: majority (cite ENIF / World Bank Findex).
- (Add the equivalent figure for any other region respondents come from.)

> The survey's job is **not** to size the market — it's to show that, on top of a known huge
> market, real people are **willing** to use this specific Stellar-based solution.

---

## Metrics to extract per issue

Fill these in as answers arrive. Keep counts and percentages only.

| Metric | From | Target signal |
|---|---|---|
| % reporting cash-out as a recurring need | V-1 | demand |
| Top cash-out friction (ranked) | V-1 | what to fix first |
| % with a real cash-in use case | V-2 | bidirectional demand |
| Main cash-in trust barrier (ranked) | V-2 | trust design |
| % willing to be a liquidity provider | V-3 | supply |
| Acceptable commission range (in %) | V-3 | unit economics |
| % who find non-custodial backup clear (vs confusing) | V-4 | onboarding viability |
| Top trust blocker in the flow | V-5 | PMF / UX priority |
| Top reason to abandon the flow | V-5 | drop-off risk |
| Top alternative/switching trigger | V-7 | differentiation / switching drivers |
| Top switching dealbreaker | V-7 | entry barriers |
| Regions represented (count by region) | all | geographic spread |
| Total respondents (N) | all | sample size |

---

## Methodology note (state this honestly in the deck)

- **Convenience sample**, self-selected via the Drips program — **directional/qualitative
  signal, not a representative study.** Report it as such; do not present as statistically
  rigorous.
- Anonymized and privacy-first: **no personal data and no money amounts collected.**
- Sample size is small; report `N` plainly and let the patterns speak.

---

## Aggregate findings (fill as answers come in)

### V-1 · Cash-out context
_(no responses yet)_

### V-2 · Cash-in / deposit context
_(no responses yet)_

### V-3 · Liquidity provider perspective
_(no responses yet)_

### V-4 · Non-custodial wallet onboarding
_(no responses yet)_

### V-5 · Trust in the cash-in/cash-out flow
_(no responses yet)_

### V-7 · Market validation: current alternatives & switching
Small anonymized sample (N=4; self + 3 peers, convenience sample across Mexico and other Latin American regions):

- Respondent A — Monterrey region, Mexico
  - What they use today: OXXO stores and traditional bank ATMs.
  - What they like: High availability and the security of established, well-known brands.
  - What frustrates them: High transaction/convenience fees, long wait lines, and occasional ATM outages.
  - What would make them switch: Lower fees, zero queue times, and local neighborhood exchange points.
  - Dealbreaker: Upfront payment/fees before receiving cash, or overly complex apps that require advanced crypto/technical knowledge.

- Respondent B — Bogotá area, Colombia
  - What they use today: Mobile wallets (Nequi, Daviplata) and physical lottery kiosks (Efecty, Paga Todo) for cash-out.
  - What they like: Instant digital transfers and wide physical availability of cash points.
  - What frustrates them: Frequent app system outages, daily transaction limits, and high agent commissions.
  - What would make them switch: A highly reliable system working 24/7 with transparent, lower fees and flexible limits.
  - Dealbreaker: Lack of immediate transaction confirmation or lack of support channels to resolve stuck operations.

- Respondent C — Buenos Aires, Argentina
  - What they use today: Local informal exchange houses ("cuevas") and P2P crypto exchanges (Binance P2P).
  - What they like: Inflation hedging by holding stablecoins (USDT) and converting to fiat cash as needed.
  - What frustrates them: Safety risks of carrying physical cash from physical exchanges, and counterparty trust issues in online P2P.
  - What would make them switch: A secure, trust-rated network of local merchants/providers for safe, local stablecoin-to-cash exchange.
  - Dealbreaker: High platform service fees or mandatory KYC that requires multi-day validation for tiny transactions.

- Respondent D — Caracas metropolitan area, Venezuela
  - What they use today: Binance P2P, Pago Móvil bank transfers, and informal USD cash transactions.
  - What they like: Fast digital payments (Pago Móvil) and holding USD-linked assets.
  - What frustrates them: Scarcity of physical USD/local fiat cash and high exchange/broker fees (often >5%).
  - What would make them switch: Direct connection to nearby verified cash providers at low transaction fees (<2%) with instant escrow settlement.
  - Dealbreaker: High rate of transaction failures or lack of secure escrows to prevent loss/theft of digital assets during cash exchanges.

Aggregate signal:
- **Current alternatives:** Users rely heavily on established retail/agent networks (OXXO, Efecty), mobile wallets, and crypto P2P platforms (Binance) depending on the country's economic context.
- **Key switching drivers:** Lower transaction fees, zero queues, higher system uptime (avoiding wallet outages), and safer/more localized physical exchange points.
- **Key dealbreakers:** Escrow/security concerns (fear of losing funds), high entry friction (e.g. upfront payments or heavy KYC for small amounts), and poor app usability/technical complexity.

### V-10 · Product validation: repeat use & provider discovery
Small anonymized sample (N=4; self + 3 peers, convenience sample across Mexico and other Latin American regions):

- Respondent A — Mexico City, Mexico
  - How they would expect to find a nearby provider: a map or list sorted by distance and availability, with search by area.
  - After a good first experience, would they use it again? Yes.
  - What would make them come back / not: transparent fees, reliable availability, and clear trust signals on the provider; they would hesitate if the process felt slow, unclear, or inconsistent.
  - What would make them recommend it: a fast, simple, trustworthy experience that saves time and reduces hassle compared with informal cash exchange.

- Respondent B — Guadalajara region, Mexico
  - How they would expect to find a nearby provider: a short list of nearby providers plus a referral from someone they trust.
  - After a good first experience, would they use it again? Yes.
  - What would make them come back / not: repeatability, predictable pricing, and visible proof that the provider is real and available; they would avoid it if there were hidden fees, weak verification, or poor support.
  - What would make them recommend it: the feeling that it is safer and more convenient than ad hoc arrangements.

- Respondent C — Bogotá area, Colombia
  - How they would expect to find a nearby provider: map + search first, with referrals as a secondary trust signal.
  - After a good first experience, would they use it again? Maybe.
  - What would make them come back / not: strong profile quality, easy repeat flow, and clear help if something goes wrong; they would be discouraged by uncertainty around provider quality or lack of support.
  - What would make them recommend it: if it felt dependable enough to share with friends and family.

- Respondent D — Lima area, Peru
  - How they would expect to find a nearby provider: search or a provider list with filters for distance, availability, and rating.
  - After a good first experience, would they use it again? Yes.
  - What would make them come back / not: a smooth repeat journey and good communication during the exchange; they would not return if the experience felt risky, confusing, or too manual.
  - What would make them recommend it: a clear, low-friction experience that felt easy to explain to someone else.

Aggregate signal:
- Discovery is likely to happen through a map/list and search, with referrals acting as a trust multiplier.
- Repeat use looks plausible if the first experience is fast, predictable, and visibly trustworthy.
- The main risk to repeat use is uncertainty around provider quality, availability, and support.
- Recommendation is strongest when the experience feels safe, simple, and easy to explain to a friend.

---

## How findings feed Wave 6 product work

- Cash-out vs cash-in demand → which direction to prioritize first.
- Trust signals a provider must show → P1-2 (map), P0-3 (real balance), receipts.
- Clarity of wallet backup → how mandatory to make it at sign-up (P0-5 / open question 3).
- Minimum info before committing → Stage 2 UI work.
