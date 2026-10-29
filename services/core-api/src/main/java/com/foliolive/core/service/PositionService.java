package com.foliolive.core.service;

import com.foliolive.core.dto.PositionDto;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.model.Position;
import com.foliolive.core.repository.PositionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class PositionService {

    private final PositionRepository positionRepository;

    public PositionService(PositionRepository positionRepository) {
        this.positionRepository = positionRepository;
    }

    public List<Position> findRawPositionsByPortfolio(String portfolioId) {
        return positionRepository.findByPortfolioId(portfolioId);
    }

    public Page<PositionDto> findPositions(
        String portfolioId,
        String symbol,
        Instrument.AssetClass assetClass,
        Instrument.Sector sector,
        Pageable pageable
    ) {
        Page<Position> positionPage;

        if (symbol != null && !symbol.isBlank()) {
            positionPage = positionRepository.findByPortfolioIdAndInstrument_SymbolContainingIgnoreCase(portfolioId, symbol.trim(), pageable);
        } else if (assetClass != null) {
            positionPage = positionRepository.findByPortfolioIdAndInstrument_AssetClass(portfolioId, assetClass, pageable);
        } else if (sector != null) {
            positionPage = positionRepository.findByPortfolioIdAndInstrument_Sector(portfolioId, sector, pageable);
        } else {
            positionPage = positionRepository.findByPortfolioId(portfolioId, pageable);
        }

        return positionPage.map(this::toDto);
    }

    public PositionDto toDto(Position pos) {
        BigDecimal markPrice = getMarkPrice(pos.getInstrument().getSymbol(), pos.getAverageCost());
        BigDecimal marketValue = pos.getQuantity().multiply(markPrice).setScale(2, RoundingMode.HALF_UP);
        BigDecimal costBasis = pos.getQuantity().multiply(pos.getAverageCost()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal unrealizedPnL = marketValue.subtract(costBasis).setScale(2, RoundingMode.HALF_UP);

        BigDecimal unrealizedPnLPercent = BigDecimal.ZERO;
        if (costBasis.compareTo(BigDecimal.ZERO) > 0) {
            unrealizedPnLPercent = unrealizedPnL
                .divide(costBasis, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
        }

        return new PositionDto(
            pos.getId(),
            pos.getPortfolio().getId(),
            pos.getInstrument().getSymbol(),
            pos.getInstrument().getName(),
            pos.getInstrument().getAssetClass(),
            pos.getInstrument().getSector(),
            pos.getQuantity(),
            pos.getAverageCost(),
            markPrice,
            marketValue,
            unrealizedPnL,
            unrealizedPnLPercent,
            pos.getInstrument().getCurrency(),
            pos.getUpdatedAt()
        );
    }

    // Deterministic mark price based on symbol base prices
    public BigDecimal getMarkPrice(String symbol, BigDecimal avgCost) {
        return switch (symbol.toUpperCase()) {
            case "AAPL" -> BigDecimal.valueOf(343.83);
            case "MSFT" -> BigDecimal.valueOf(531.01);
            case "NVDA" -> BigDecimal.valueOf(215.38);
            case "GOOGL" -> BigDecimal.valueOf(324.89);
            case "META" -> BigDecimal.valueOf(612.49);
            case "AMZN" -> BigDecimal.valueOf(254.60);
            case "TSLA" -> BigDecimal.valueOf(404.22);
            case "JPM" -> BigDecimal.valueOf(339.30);
            case "GS" -> BigDecimal.valueOf(925.17);
            case "MS" -> BigDecimal.valueOf(190.13);
            case "BAC" -> BigDecimal.valueOf(50.85);
            case "JNJ" -> BigDecimal.valueOf(271.04);
            case "PFE" -> BigDecimal.valueOf(29.45);
            case "UNH" -> BigDecimal.valueOf(407.10);
            case "LLY" -> BigDecimal.valueOf(1288.30);
            case "HD" -> BigDecimal.valueOf(317.56);
            case "NKE" -> BigDecimal.valueOf(37.15);
            case "XOM" -> BigDecimal.valueOf(182.02);
            case "CVX" -> BigDecimal.valueOf(229.20);
            case "SLB" -> BigDecimal.valueOf(53.75);
            case "BND" -> BigDecimal.valueOf(71.19);
            case "TLT" -> BigDecimal.valueOf(80.99);
            case "HYG" -> BigDecimal.valueOf(77.59);
            case "AGG" -> BigDecimal.valueOf(95.89);
            case "GLD" -> BigDecimal.valueOf(373.51);
            case "SLV" -> BigDecimal.valueOf(49.06);
            case "USO" -> BigDecimal.valueOf(166.57);
            default -> avgCost.multiply(BigDecimal.valueOf(1.04)).setScale(2, RoundingMode.HALF_UP);
        };
    }
}
