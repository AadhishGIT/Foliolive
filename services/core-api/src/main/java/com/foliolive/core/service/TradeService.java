package com.foliolive.core.service;

import com.foliolive.core.dto.TradeDto;
import com.foliolive.core.exception.BusinessValidationException;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.Position;
import com.foliolive.core.model.Trade;
import com.foliolive.core.repository.InstrumentRepository;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.PositionRepository;
import com.foliolive.core.repository.TradeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TradeService {

    private final TradeRepository tradeRepository;
    private final PortfolioRepository portfolioRepository;
    private final PositionRepository positionRepository;
    private final InstrumentRepository instrumentRepository;

    public TradeService(
        TradeRepository tradeRepository,
        PortfolioRepository portfolioRepository,
        PositionRepository positionRepository,
        InstrumentRepository instrumentRepository
    ) {
        this.tradeRepository = tradeRepository;
        this.portfolioRepository = portfolioRepository;
        this.positionRepository = positionRepository;
        this.instrumentRepository = instrumentRepository;
    }

    public List<TradeDto.Response> findTrades(String portfolioId) {
        return tradeRepository.findByPortfolioIdOrderByExecutedAtDesc(portfolioId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    public Page<TradeDto.Response> findTradesPaginated(String portfolioId, Pageable pageable) {
        return tradeRepository.findByPortfolioIdOrderByExecutedAtDesc(portfolioId, pageable)
            .map(this::toDto);
    }

    @Transactional
    public TradeDto.Response executeTrade(String portfolioId, TradeDto.Create request) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
            .orElseThrow(() -> new ResourceNotFoundException("Portfolio not found: " + portfolioId));

        Instrument instrument = instrumentRepository.findById(request.symbol().toUpperCase())
            .orElseThrow(() -> new ResourceNotFoundException("Instrument not found: " + request.symbol()));

        BigDecimal totalAmount = request.quantity().multiply(request.price()).setScale(4, RoundingMode.HALF_UP);

        if (request.side() == Trade.TradeSide.BUY) {
            if (portfolio.getCashBalance().compareTo(totalAmount) < 0) {
                throw new BusinessValidationException("Insufficient cash balance for BUY trade. Required: $" +
                    totalAmount + ", Available: $" + portfolio.getCashBalance());
            }

            portfolio.setCashBalance(portfolio.getCashBalance().subtract(totalAmount));

            Position position = positionRepository.findByPortfolioIdAndInstrument_Symbol(portfolioId, instrument.getSymbol())
                .orElse(null);

            if (position != null) {
                BigDecimal oldTotalCost = position.getQuantity().multiply(position.getAverageCost());
                BigDecimal newTotalCost = oldTotalCost.add(totalAmount);
                BigDecimal newQuantity = position.getQuantity().add(request.quantity());
                BigDecimal newAverageCost = newTotalCost.divide(newQuantity, 4, RoundingMode.HALF_UP);

                position.setQuantity(newQuantity);
                position.setAverageCost(newAverageCost);
                position.setUpdatedAt(Instant.now());
                positionRepository.save(position);
            } else {
                Position newPos = new Position(
                    "pos_" + UUID.randomUUID().toString().substring(0, 8),
                    portfolio,
                    instrument,
                    request.quantity(),
                    request.price()
                );
                positionRepository.save(newPos);
            }
        } else {
            // SELL
            Position position = positionRepository.findByPortfolioIdAndInstrument_Symbol(portfolioId, instrument.getSymbol())
                .orElseThrow(() -> new BusinessValidationException("Cannot SELL instrument not currently in portfolio: " + instrument.getSymbol()));

            if (position.getQuantity().compareTo(request.quantity()) < 0) {
                throw new BusinessValidationException("Insufficient shares to sell. Available: " +
                    position.getQuantity() + ", Requested: " + request.quantity());
            }

            portfolio.setCashBalance(portfolio.getCashBalance().add(totalAmount));

            BigDecimal remainingQuantity = position.getQuantity().subtract(request.quantity());
            if (remainingQuantity.compareTo(BigDecimal.ZERO) == 0) {
                positionRepository.delete(position);
            } else {
                position.setQuantity(remainingQuantity);
                position.setUpdatedAt(Instant.now());
                positionRepository.save(position);
            }
        }

        portfolio.setUpdatedAt(Instant.now());
        portfolioRepository.save(portfolio);

        Trade trade = new Trade(
            "trd_" + UUID.randomUUID().toString().substring(0, 8),
            portfolio,
            instrument,
            request.side(),
            request.quantity(),
            request.price(),
            totalAmount
        );

        Trade saved = tradeRepository.save(trade);
        return toDto(saved);
    }

    private TradeDto.Response toDto(Trade t) {
        return new TradeDto.Response(
            t.getId(),
            t.getPortfolio().getId(),
            t.getInstrument().getSymbol(),
            t.getInstrument().getName(),
            t.getSide(),
            t.getQuantity(),
            t.getPrice(),
            t.getTotalAmount(),
            t.getExecutedAt()
        );
    }
}
