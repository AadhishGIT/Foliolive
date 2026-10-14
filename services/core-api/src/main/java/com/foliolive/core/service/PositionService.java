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
            case "AAPL" -> BigDecimal.valueOf(185.50);
            case "MSFT" -> BigDecimal.valueOf(420.20);
            case "NVDA" -> BigDecimal.valueOf(125.00);
            case "GOOGL" -> BigDecimal.valueOf(175.80);
            case "META" -> BigDecimal.valueOf(492.40);
            case "AMZN" -> BigDecimal.valueOf(182.40);
            case "TSLA" -> BigDecimal.valueOf(188.60);
            case "JPM" -> BigDecimal.valueOf(198.60);
            case "GS" -> BigDecimal.valueOf(460.00);
            case "MS" -> BigDecimal.valueOf(98.40);
            case "BAC" -> BigDecimal.valueOf(39.80);
            case "JNJ" -> BigDecimal.valueOf(156.20);
            case "PFE" -> BigDecimal.valueOf(28.40);
            case "UNH" -> BigDecimal.valueOf(504.00);
            case "LLY" -> BigDecimal.valueOf(820.50);
            case "HD" -> BigDecimal.valueOf(342.10);
            case "NKE" -> BigDecimal.valueOf(94.20);
            case "XOM" -> BigDecimal.valueOf(118.50);
            case "CVX" -> BigDecimal.valueOf(158.20);
            case "SLB" -> BigDecimal.valueOf(48.60);
            case "BND" -> BigDecimal.valueOf(72.40);
            case "TLT" -> BigDecimal.valueOf(91.20);
            case "HYG" -> BigDecimal.valueOf(77.80);
            case "AGG" -> BigDecimal.valueOf(97.60);
            case "GLD" -> BigDecimal.valueOf(215.30);
            case "SLV" -> BigDecimal.valueOf(28.20);
            case "USO" -> BigDecimal.valueOf(76.50);
            default -> avgCost.multiply(BigDecimal.valueOf(1.04)).setScale(2, RoundingMode.HALF_UP);
        };
    }
}
