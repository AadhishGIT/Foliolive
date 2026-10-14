package com.foliolive.core.dto;

import com.foliolive.core.model.RiskLimit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;

public class RiskLimitDto {
    public record Create(
        @NotNull(message = "Limit type is required")
        RiskLimit.LimitType type,

        @NotNull(message = "Threshold is required")
        @Positive(message = "Threshold must be positive")
        BigDecimal threshold,

        @NotBlank(message = "Unit is required")
        String unit,

        boolean enabled
    ) {}

    public record Response(
        String id,
        String portfolioId,
        RiskLimit.LimitType type,
        BigDecimal threshold,
        String unit,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
    ) {}
}
