package com.foliolive.core.dto;

import com.foliolive.core.model.Alert;
import java.math.BigDecimal;
import java.time.Instant;

public record AlertDto(
    String id,
    String portfolioId,
    String riskLimitId,
    String type,
    Alert.AlertSeverity severity,
    String title,
    String message,
    BigDecimal currentValue,
    BigDecimal thresholdValue,
    String unit,
    boolean acknowledged,
    Instant createdAt
) {}
