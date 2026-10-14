package com.foliolive.core.service;

import com.foliolive.core.dto.RiskAnalyticsDto;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.Position;
import com.foliolive.core.model.User;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RiskCalculationServiceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private PositionService positionService;

    private RiskCalculationService riskService;

    @BeforeEach
    void setUp() {
        riskService = new RiskCalculationService(portfolioRepository, positionRepository, positionService);
    }

    @Test
    @DisplayName("Verify Parametric VaR (95% and 99%) against analytical ground truths")
    void testParametricVaRCalculation() {
        double portfolioValue = 10_000_000.0;
        double dailyVolatility = 0.015; // 1.5% daily standard deviation

        // Ground truth: VaR_95 = 1.6448536269514722 * 0.015 * 10,000,000 = 246,728.044
        double var95 = riskService.calculateParametricVaR(portfolioValue, dailyVolatility, RiskCalculationService.Z_95);
        assertEquals(246728.04, var95, 0.1, "Parametric 95% VaR must match normal analytical quantile");

        // Ground truth: VaR_99 = 2.3263478740408408 * 0.015 * 10,000,000 = 348,952.181
        double var99 = riskService.calculateParametricVaR(portfolioValue, dailyVolatility, RiskCalculationService.Z_99);
        assertEquals(348952.18, var99, 0.1, "Parametric 99% VaR must match normal analytical quantile");
    }

    @Test
    @DisplayName("Verify Historical Simulation VaR and Expected Shortfall with known vector")
    void testHistoricalVaRAndExpectedShortfall() {
        double portfolioValue = 1_000_000.0;
        // Construct 100 historical returns sorted: -0.10, -0.09, -0.08, ..., +0.89
        double[] returns = new double[100];
        for (int i = 0; i < 100; i++) {
            returns[i] = -0.10 + (i * 0.01);
        }

        // 5% quantile: index floor(0.05 * 100) = 5 -> return is -0.10 + 5*0.01 = -0.05 (-5.0% loss)
        double var95 = riskService.calculateHistoricalVaR(returns, 0.05, portfolioValue);
        assertEquals(50000.0, var95, 1e-4, "Historical 95% VaR must equal 5th percentile loss * portfolio value");

        // 1% quantile: index floor(0.01 * 100) = 1 -> return is -0.10 + 1*0.01 = -0.09 (-9.0% loss)
        double var99 = riskService.calculateHistoricalVaR(returns, 0.01, portfolioValue);
        assertEquals(90000.0, var99, 1e-4, "Historical 99% VaR must equal 1st percentile loss * portfolio value");

        // Expected Shortfall at 5% (mean of worst 5 losses: indices 0..4 = -0.10, -0.09, -0.08, -0.07, -0.06 -> mean = -0.08)
        double es95 = riskService.calculateExpectedShortfall(returns, 0.05, portfolioValue);
        assertEquals(80000.0, es95, 1e-4, "Expected Shortfall must equal the mean of tail losses beyond quantile");
    }

    @Test
    @DisplayName("Verify Herfindahl-Hirschman Index (HHI) for known allocations")
    void testHHICalculation() {
        // Equal-weighted 4-asset portfolio (25% each): HHI = 4 * (25^2) = 2500.0
        double[] equalWeights = {0.25, 0.25, 0.25, 0.25};
        double hhiEqual = riskService.calculateHHI(equalWeights);
        assertEquals(2500.0, hhiEqual, 1e-6, "4-asset equal weighted HHI must equal 2500.0");

        // Single-asset concentrated portfolio (100%): HHI = 100^2 = 10000.0
        double[] singleAsset = {1.0};
        double hhiSingle = riskService.calculateHHI(singleAsset);
        assertEquals(10000.0, hhiSingle, 1e-6, "Single asset concentrated HHI must equal 10000.0");

        // 10-asset equal weighted portfolio (10% each): HHI = 10 * (10^2) = 1000.0
        double[] tenAsset = {0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1};
        double hhiTen = riskService.calculateHHI(tenAsset);
        assertEquals(1000.0, hhiTen, 1e-6, "10-asset equal weighted HHI must equal 1000.0");
    }

    @Test
    @DisplayName("Verify Systematic Beta against benchmark with linear correlation")
    void testBetaCalculation() {
        int days = 100;
        double[] benchmark = new double[days];
        double[] portfolio = new double[days];

        // Construct benchmark with known variance and portfolio = 1.35 * benchmark + noise
        for (int i = 0; i < days; i++) {
            benchmark[i] = (i - 50.0) * 0.001; // mean = -0.0005
            portfolio[i] = 1.35 * benchmark[i];
        }

        double beta = riskService.calculateBeta(portfolio, benchmark);
        assertEquals(1.35, beta, 1e-4, "Portfolio with 1.35x benchmark factor must have beta = 1.35");
    }

    @Test
    @DisplayName("Verify full portfolio risk analytics computation with mock positions")
    void testComputePortfolioRisk() {
        User user = new User("usr_01", "pm_demo", "pm@foliolive.internal", "hash", "PM", User.Role.ROLE_PM);
        Portfolio portfolio = new Portfolio("port_01", "Test Fund", "Desc", "USD", BigDecimal.valueOf(100000), user);

        Instrument inst1 = new Instrument("AAPL", "Apple Inc.", Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY, "USD");
        Instrument inst2 = new Instrument("BND", "Vanguard Bond", Instrument.AssetClass.FIXED_INCOME, Instrument.Sector.FINANCIALS, "USD");

        Position pos1 = new Position("pos_1", portfolio, inst1, BigDecimal.valueOf(1000), BigDecimal.valueOf(150.0));
        Position pos2 = new Position("pos_2", portfolio, inst2, BigDecimal.valueOf(2000), BigDecimal.valueOf(70.0));

        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));
        when(positionRepository.findByPortfolioId("port_01")).thenReturn(List.of(pos1, pos2));
        when(positionService.getMarkPrice(eq("AAPL"), any())).thenReturn(BigDecimal.valueOf(185.50));
        when(positionService.getMarkPrice(eq("BND"), any())).thenReturn(BigDecimal.valueOf(72.40));

        RiskAnalyticsDto result = riskService.computePortfolioRisk("port_01");

        assertNotNull(result);
        assertEquals("port_01", result.portfolioId());
        assertTrue(result.portfolioMarketValue().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(result.totalPortfolioValue().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(result.parametricVaR95().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(result.historicalVaR95().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(result.herfindahlHirschmanIndex() > 0);
        assertNotNull(result.sectorExposures().get("TECHNOLOGY"));
        assertNotNull(result.assetClassExposures().get("EQUITY"));
    }
}
