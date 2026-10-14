package com.foliolive.core.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "instruments")
public class Instrument {

    public enum AssetClass {
        EQUITY,
        FIXED_INCOME,
        COMMODITY,
        CRYPTO,
        FX
    }

    public enum Sector {
        TECHNOLOGY,
        FINANCIALS,
        HEALTHCARE,
        CONSUMER_DISCRETIONARY,
        ENERGY,
        INDUSTRIALS,
        MATERIALS,
        COMMUNICATION_SERVICES,
        UTILITIES,
        REAL_ESTATE
    }

    @Id
    @Column(length = 20)
    private String symbol;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_class", nullable = false, length = 50)
    private AssetClass assetClass;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 100)
    private Sector sector;

    @Column(nullable = false, length = 10)
    private String currency = "USD";

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public Instrument() {}

    public Instrument(String symbol, String name, AssetClass assetClass, Sector sector, String currency) {
        this.symbol = symbol;
        this.name = name;
        this.assetClass = assetClass;
        this.sector = sector;
        this.currency = currency;
        this.createdAt = Instant.now();
    }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public AssetClass getAssetClass() { return assetClass; }
    public void setAssetClass(AssetClass assetClass) { this.assetClass = assetClass; }
    public Sector getSector() { return sector; }
    public void setSector(Sector sector) { this.sector = sector; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
