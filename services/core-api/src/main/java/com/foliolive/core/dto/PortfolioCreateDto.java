package com.foliolive.core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record PortfolioCreateDto(
    @NotBlank(message = "Portfolio name is required")
    String name,

    String description,

    @NotBlank(message = "Currency is required")
    String currency,

    @NotNull(message = "Initial cash balance is required")
    @PositiveOrZero(message = "Initial cash balance cannot be negative")
    BigDecimal cashBalance
) {}
