package com.foliolive.core.dto;

import com.foliolive.core.model.Trade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;

public class TradeDto {
    public record Create(
        @NotBlank(message = "Instrument symbol is required")
        String symbol,

        @NotNull(message = "Side (BUY/SELL) is required")
        Trade.TradeSide side,

        @NotNull(message = "Quantity is required")
        @Positive(message = "Quantity must be positive")
        BigDecimal quantity,

        @NotNull(message = "Price is required")
        @Positive(message = "Price must be positive")
        BigDecimal price
    ) {}

    public record Response(
        String id,
        String portfolioId,
        String symbol,
        String instrumentName,
        Trade.TradeSide side,
        BigDecimal quantity,
        BigDecimal price,
        BigDecimal totalAmount,
        Instant executedAt
    ) {}
}
