package com.foliolive.core.dto;

import com.foliolive.core.model.Instrument;
import java.math.BigDecimal;
import java.time.Instant;

public record PositionDto(
    String id,
    String portfolioId,
    String symbol,
    String instrumentName,
    Instrument.AssetClass assetClass,
    Instrument.Sector sector,
    BigDecimal quantity,
    BigDecimal averageCost,
    BigDecimal currentPrice,
    BigDecimal marketValue,
    BigDecimal unrealizedPnL,
    BigDecimal unrealizedPnLPercent,
    String currency,
    Instant updatedAt
) {}
