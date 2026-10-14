package com.foliolive.core.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "risk_limits")
public class RiskLimit {

    public enum LimitType {
        VAR_95,
        VAR_99,
        DRAWDOWN,
        CONCENTRATION,
        LEVERAGE
    }

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private LimitType type;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal threshold;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public RiskLimit() {}

    public RiskLimit(String id, Portfolio portfolio, LimitType type, BigDecimal threshold, String unit, boolean enabled) {
        this.id = id;
        this.portfolio = portfolio;
        this.type = type;
        this.threshold = threshold;
        this.unit = unit;
        this.enabled = enabled;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Portfolio getPortfolio() { return portfolio; }
    public void setPortfolio(Portfolio portfolio) { this.portfolio = portfolio; }
    public LimitType getType() { return type; }
    public void setType(LimitType type) { this.type = type; }
    public BigDecimal getThreshold() { return threshold; }
    public void setThreshold(BigDecimal threshold) { this.threshold = threshold; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
