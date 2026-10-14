package com.foliolive.core.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "alerts")
public class Alert {

    public enum AlertSeverity {
        INFO,
        WARNING,
        CRITICAL
    }

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "risk_limit_id")
    private RiskLimit riskLimit;

    @Column(nullable = false, length = 50)
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertSeverity severity;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "current_value", nullable = false, precision = 18, scale = 4)
    private BigDecimal currentValue;

    @Column(name = "threshold_value", nullable = false, precision = 18, scale = 4)
    private BigDecimal thresholdValue;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(nullable = false)
    private boolean acknowledged = false;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public Alert() {}

    public Alert(String id, Portfolio portfolio, RiskLimit riskLimit, String type, AlertSeverity severity, String title, String message, BigDecimal currentValue, BigDecimal thresholdValue, String unit) {
        this.id = id;
        this.portfolio = portfolio;
        this.riskLimit = riskLimit;
        this.type = type;
        this.severity = severity;
        this.title = title;
        this.message = message;
        this.currentValue = currentValue;
        this.thresholdValue = thresholdValue;
        this.unit = unit;
        this.acknowledged = false;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Portfolio getPortfolio() { return portfolio; }
    public void setPortfolio(Portfolio portfolio) { this.portfolio = portfolio; }
    public RiskLimit getRiskLimit() { return riskLimit; }
    public void setRiskLimit(RiskLimit riskLimit) { this.riskLimit = riskLimit; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public BigDecimal getCurrentValue() { return currentValue; }
    public void setCurrentValue(BigDecimal currentValue) { this.currentValue = currentValue; }
    public BigDecimal getThresholdValue() { return thresholdValue; }
    public void setThresholdValue(BigDecimal thresholdValue) { this.thresholdValue = thresholdValue; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public boolean isAcknowledged() { return acknowledged; }
    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
