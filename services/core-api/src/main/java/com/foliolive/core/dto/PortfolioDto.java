package com.foliolive.core.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PortfolioDto(
    String id,
    String name,
    String description,
    String currency,
    BigDecimal cashBalance,
    String createdByUserId,
    int positionsCount,
    Instant createdAt,
    Instant updatedAt
) {}
