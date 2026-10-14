# Foliolive: Institutional Risk & VaR Methodology

## 1. Scope & Objective

This document defines the mathematical models, statistical definitions, and algorithmic implementations for risk analytics computed by the Foliolive Core Engine (`com.foliolive.core.service.RiskCalculationService`).

The risk engine computes portfolio valuation, Value at Risk (VaR), Conditional Value at Risk (CVaR / Expected Shortfall), concentration indices, and systematic factor beta over a rolling 250-trading-day observation window ($T = 250$).

---

## 2. Portfolio Valuation & P&L

Given a portfolio containing $N$ positions where each position $i$ holds quantity $q_i$, purchase cost $C_i$, current mark price $P_{i, t}$, and previous closing mark price $P_{i, t-1}$:

### 2.1 Market Value & Weights

- **Gross Market Value**:
  $$V_p = \sum_{i=1}^N q_i P_{i, t}$$
- **Asset Weight**:
  $$w_i = \frac{q_i P_{i, t}}{V_p}$$
  where $\sum_{i=1}^N w_i = 1$ (for long-only portfolios without leverage).

### 2.2 Profit and Loss (P&L)

- **Total Unrealized P&L**:
  $$\text{UPnL} = \sum_{i=1}^N q_i (P_{i, t} - C_i)$$
- **Daily P&L**:
  $$\Delta V = \sum_{i=1}^N q_i (P_{i, t} - P_{i, t-1})$$
- **Daily Return**:
  $$R_p = \frac{\Delta V}{V_p - \Delta V}$$

---

## 3. Value at Risk (VaR) Formulations

Value at Risk represents the maximum expected loss over a 1-day holding period at a given confidence horizon ($1 - \alpha$).

### 3.1 Historical Simulation VaR

Historical simulation makes zero distributional assumptions regarding asset return normality. It applies observed historical return vectors to current portfolio weights.

1. **Scenario Return Computation**:
   For each historical day $t \in [1, T]$ ($T = 250$):
   $$R_{p, t} = \sum_{i=1}^N w_i R_{i, t}$$
   where $R_{i, t} = \frac{P_{i, t} - P_{i, t-1}}{P_{i, t-1}}$.

2. **Ascending Order Statistic**:
   Sort the array of 250 scenario returns in ascending order:
   $$R_{p, (1)} \le R_{p, (2)} \le \dots \le R_{p, (T)}$$

3. **Percentile Cutoffs**:
   - For **95% Confidence** ($\alpha = 0.05$):
     Rank index $k_{0.05} = \lceil 0.05 \times 250 \rceil = 13$ (or percentile rank $\approx 12.5$).
     $$\text{VaR}_{95\%}^{\text{Hist}} = - R_{p, (k_{0.05})} \times V_p$$
   - For **99% Confidence** ($\alpha = 0.01$):
     Rank index $k_{0.01} = \lceil 0.01 \times 250 \rceil = 3$ (or percentile rank $\approx 2.5$).
     $$\text{VaR}_{99\%}^{\text{Hist}} = - R_{p, (k_{0.01})} \times V_p$$

### 3.2 Expected Shortfall (CVaR / Conditional VaR)

Expected Shortfall measures the tail expectation of losses beyond the VaR threshold (a coherent risk measure):
$$\text{ES}_\alpha = - \frac{1}{k_\alpha} \sum_{j=1}^{k_\alpha} R_{p, (j)} \times V_p$$
where $k_\alpha$ is the number of historical returns falling at or below the $\alpha$-quantile.

### 3.3 Parametric (Variance-Covariance) VaR

Parametric VaR assumes log-normal price dynamics and multivariate normal asset returns.

1. **Portfolio Volatility**:
   Given asset covariance matrix $\mathbf{\Sigma} \in \mathbb{R}^{N \times N}$ and weight vector $\mathbf{w} \in \mathbb{R}^N$:
   $$\sigma_p^2 = \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} = \sum_{i=1}^N \sum_{j=1}^N w_i w_j \sigma_{ij}$$
   $$\sigma_p = \sqrt{\sigma_p^2}$$

2. **Normal Inverse CDF Multipliers**:
   - $95\%$ Confidence: $z_{0.95} \approx 1.644853$
   - $99\%$ Confidence: $z_{0.99} \approx 2.326348$

3. **Parametric Dollar VaR**:
   $$\text{VaR}_{95\%}^{\text{Param}} = z_{0.95} \times \sigma_p \times V_p$$
   $$\text{VaR}_{99\%}^{\text{Param}} = z_{0.99} \times \sigma_p \times V_p$$

---

## 4. Concentration & Exposure Analytics

### 4.1 Herfindahl-Hirschman Index (HHI)

$$\text{HHI} = \sum_{i=1}^N (w_i \times 100)^2$$

- $\text{HHI} < 1,500$: Unconcentrated / diversified portfolio
- $1,500 \le \text{HHI} \le 2,500$: Moderately concentrated portfolio
- $\text{HHI} > 2,500$: Highly concentrated portfolio

### 4.2 Top-N Concentration

- $\text{Top 5} = \sum_{k=1}^{\min(5, N)} w_{(k)} \times 100$
- $\text{Top 10} = \sum_{k=1}^{\min(10, N)} w_{(k)} \times 100$
  where $w_{(k)}$ is the $k$-th largest asset weight.

### 4.3 Sector and Asset Class Exposures

Aggregations grouping weights by sector $S$ and asset class $A$:
$$\text{Exposure}(S) = \sum_{i \in S} w_i \times 100$$
$$\text{Exposure}(A) = \sum_{i \in A} w_i \times 100$$

---

## 5. Systematic Benchmark Beta ($\beta$)

The portfolio sensitivity against the broad market benchmark (simulated S&P 500 / SPY return series $R_m$):
$$\beta = \frac{\text{Cov}(R_p, R_m)}{\text{Var}(R_m)} = \frac{\sum_{t=1}^T (R_{p, t} - \bar{R}_p)(R_{m, t} - \bar{R}_m)}{\sum_{t=1}^T (R_{m, t} - \bar{R}_m)^2}$$

- $\beta > 1$: Higher systematic volatility than the market
- $\beta = 1$: Moves in lockstep with the benchmark
- $0 < \beta < 1$: Defensive exposure / lower volatility than the benchmark
- $\beta < 0$: Inverse / hedging correlation
