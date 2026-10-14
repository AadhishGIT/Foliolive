package com.foliolive.core.service;

import com.foliolive.core.dto.TradeDto;
import com.foliolive.core.exception.BusinessValidationException;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.Position;
import com.foliolive.core.model.Trade;
import com.foliolive.core.repository.InstrumentRepository;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.PositionRepository;
import com.foliolive.core.repository.TradeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TradeServiceTest {

    @Mock
    private TradeRepository tradeRepository;

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private InstrumentRepository instrumentRepository;

    private TradeService tradeService;

    @BeforeEach
    void setUp() {
        tradeService = new TradeService(tradeRepository, portfolioRepository, positionRepository, instrumentRepository);
    }

    @Test
    @DisplayName("BUY trade successfully updates existing position average cost and reduces cash")
    void testExecuteBuyTradeExistingPosition() {
        Portfolio portfolio = new Portfolio("port_01", "Fund", "Desc", "USD", BigDecimal.valueOf(50000), null);
        Instrument instrument = new Instrument("AAPL", "Apple Inc.", Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY, "USD");
        Position existingPosition = new Position("pos_01", portfolio, instrument, BigDecimal.valueOf(100), BigDecimal.valueOf(150.00));

        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));
        when(instrumentRepository.findById("AAPL")).thenReturn(Optional.of(instrument));
        when(positionRepository.findByPortfolioIdAndInstrument_Symbol("port_01", "AAPL")).thenReturn(Optional.of(existingPosition));
        when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Buy 100 shares at $200 (Total cost = $20,000)
        // New qty = 200, New avg cost = (100*150 + 100*200) / 200 = 35000 / 200 = $175.00
        // New cash = 50,000 - 20,000 = 30,000
        TradeDto.Create request = new TradeDto.Create("AAPL", Trade.TradeSide.BUY, BigDecimal.valueOf(100), BigDecimal.valueOf(200.00));
        TradeDto.Response response = tradeService.executeTrade("port_01", request);

        assertNotNull(response);
        assertEquals(Trade.TradeSide.BUY, response.side());
        assertEquals(new BigDecimal("175.0000"), existingPosition.getAverageCost());
        assertEquals(new BigDecimal("200"), existingPosition.getQuantity());
        assertEquals(new BigDecimal("30000.0000"), portfolio.getCashBalance());
        verify(positionRepository).save(existingPosition);
    }

    @Test
    @DisplayName("BUY trade throws BusinessValidationException when cash balance is insufficient")
    void testExecuteBuyTradeInsufficientCash() {
        Portfolio portfolio = new Portfolio("port_01", "Fund", "Desc", "USD", BigDecimal.valueOf(1000), null);
        Instrument instrument = new Instrument("NVDA", "Nvidia", Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY, "USD");

        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));
        when(instrumentRepository.findById("NVDA")).thenReturn(Optional.of(instrument));

        TradeDto.Create request = new TradeDto.Create("NVDA", Trade.TradeSide.BUY, BigDecimal.valueOf(100), BigDecimal.valueOf(120.00)); // requires $12,000

        assertThrows(BusinessValidationException.class, () -> tradeService.executeTrade("port_01", request));
        verify(tradeRepository, never()).save(any());
    }

    @Test
    @DisplayName("SELL trade reduces position quantity and increases portfolio cash")
    void testExecuteSellTrade() {
        Portfolio portfolio = new Portfolio("port_01", "Fund", "Desc", "USD", BigDecimal.valueOf(5000), null);
        Instrument instrument = new Instrument("AAPL", "Apple", Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY, "USD");
        Position existingPosition = new Position("pos_01", portfolio, instrument, BigDecimal.valueOf(100), BigDecimal.valueOf(150.00));

        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));
        when(instrumentRepository.findById("AAPL")).thenReturn(Optional.of(instrument));
        when(positionRepository.findByPortfolioIdAndInstrument_Symbol("port_01", "AAPL")).thenReturn(Optional.of(existingPosition));
        when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Sell 40 shares at $180 -> proceeds = $7,200
        // Remaining qty = 60, New cash = 5,000 + 7,200 = 12,200
        TradeDto.Create request = new TradeDto.Create("AAPL", Trade.TradeSide.SELL, BigDecimal.valueOf(40), BigDecimal.valueOf(180.00));
        TradeDto.Response response = tradeService.executeTrade("port_01", request);

        assertNotNull(response);
        assertEquals(Trade.TradeSide.SELL, response.side());
        assertEquals(new BigDecimal("60"), existingPosition.getQuantity());
        assertEquals(new BigDecimal("12200.0000"), portfolio.getCashBalance());
        verify(positionRepository).save(existingPosition);
    }
}
