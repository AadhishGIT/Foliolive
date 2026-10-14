package com.foliolive.core.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

public record RiskAnalyticsDto(
    String portfolioId,
    BigDecimal portfolioMarketValue,
    BigDecimal cashBalance,
    BigDecimal totalPortfolioValue,
    BigDecimal totalUnrealizedPnL,
    BigDecimal totalUnrealizedPnLPercent,
    BigDecimal dailyPnL,
    BigDecimal dailyPnLPercent,
    BigDecimal parametricVaR95,
    BigDecimal parametricVaR99,
    BigDecimal historicalVaR95,
    BigDecimal historicalVaR99,
    BigDecimal expectedShortfall95,
    BigDecimal expectedShortfall99,
    double herfindahlHirschmanIndex,
    double top5ConcentrationPercent,
    double top10ConcentrationPercent,
    double beta,
    Map<String, BigDecimal> sectorExposures,
    Map<String, BigDecimal> assetClassExposures,
    Instant calculationTimestamp
) {}
