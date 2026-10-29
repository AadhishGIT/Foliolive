package com.foliolive.core.service;

import com.foliolive.core.dto.PositionDto;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.Position;
import com.foliolive.core.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PositionServiceTest {

    @Mock
    private PositionRepository positionRepository;

    @InjectMocks
    private PositionService positionService;

    private Portfolio portfolio;
    private Instrument aapl;
    private Position position;

    @BeforeEach
    void setUp() {
        portfolio = new Portfolio("port_01", "Global Alpha Fund", "Desc", "USD", BigDecimal.valueOf(5000000), null);
        aapl = new Instrument("AAPL", "Apple Inc.", Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY, "USD");
        // quantity: 100, avgCost: 150.00
        position = new Position("pos_01", portfolio, aapl, BigDecimal.valueOf(100), BigDecimal.valueOf(150.00));
    }

    @Test
    @DisplayName("findRawPositionsByPortfolio returns list of entities")
    void testFindRawPositionsByPortfolio() {
        when(positionRepository.findByPortfolioId("port_01")).thenReturn(List.of(position));

        List<Position> result = positionService.findRawPositionsByPortfolio("port_01");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("pos_01");
    }

    @Test
    @DisplayName("findPositions without filters returns paginated DTOs")
    void testFindPositionsUnfiltered() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Position> page = new PageImpl<>(List.of(position), pageable, 1);
        when(positionRepository.findByPortfolioId("port_01", pageable)).thenReturn(page);

        Page<PositionDto> result = positionService.findPositions("port_01", null, null, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        PositionDto dto = result.getContent().get(0);
        assertThat(dto.symbol()).isEqualTo("AAPL");
        assertThat(dto.quantity()).isEqualByComparingTo(BigDecimal.valueOf(100));
        // AAPL mark price is 343.83
        // market value = 100 * 343.83 = 34383.00
        // cost basis = 100 * 150.00 = 15000.00
        // unrealized PnL = 34383 - 15000 = 19383.00
        // unrealized PnL % = (19383 / 15000) * 100 = 129.22%
        assertThat(dto.currentPrice()).isEqualByComparingTo(BigDecimal.valueOf(343.83));
        assertThat(dto.marketValue()).isEqualByComparingTo(BigDecimal.valueOf(34383.00));
        assertThat(dto.unrealizedPnL()).isEqualByComparingTo(BigDecimal.valueOf(19383.00));
        assertThat(dto.unrealizedPnLPercent()).isEqualByComparingTo(BigDecimal.valueOf(129.22));
    }

    @Test
    @DisplayName("findPositions with symbol filter queries by symbol")
    void testFindPositionsSymbolFilter() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Position> page = new PageImpl<>(List.of(position), pageable, 1);
        when(positionRepository.findByPortfolioIdAndInstrument_SymbolContainingIgnoreCase("port_01", "AAP", pageable))
            .thenReturn(page);

        Page<PositionDto> result = positionService.findPositions("port_01", "AAP", null, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).symbol()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("findPositions with assetClass filter")
    void testFindPositionsAssetClassFilter() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Position> page = new PageImpl<>(List.of(position), pageable, 1);
        when(positionRepository.findByPortfolioIdAndInstrument_AssetClass("port_01", Instrument.AssetClass.EQUITY, pageable))
            .thenReturn(page);

        Page<PositionDto> result = positionService.findPositions("port_01", null, Instrument.AssetClass.EQUITY, null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("findPositions with sector filter")
    void testFindPositionsSectorFilter() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Position> page = new PageImpl<>(List.of(position), pageable, 1);
        when(positionRepository.findByPortfolioIdAndInstrument_Sector("port_01", Instrument.Sector.TECHNOLOGY, pageable))
            .thenReturn(page);

        Page<PositionDto> result = positionService.findPositions("port_01", null, null, Instrument.Sector.TECHNOLOGY, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getMarkPrice fallback uses avgCost * 1.04")
    void testGetMarkPriceFallback() {
        BigDecimal mark = positionService.getMarkPrice("UNKNOWN_SYM", BigDecimal.valueOf(100.00));
        assertThat(mark).isEqualByComparingTo(BigDecimal.valueOf(104.00));
    }
}
