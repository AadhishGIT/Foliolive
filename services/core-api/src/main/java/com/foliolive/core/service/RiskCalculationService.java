package com.foliolive.core.service;

import com.foliolive.core.dto.RiskAnalyticsDto;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.Position;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.PositionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class RiskCalculationService {

    public static final int HISTORICAL_DAYS = 250;
    public static final double Z_95 = 1.6448536269514722;
    public static final double Z_99 = 2.3263478740408408;

    private final PortfolioRepository portfolioRepository;
    private final PositionRepository positionRepository;
    private final PositionService positionService;

    public RiskCalculationService(
        PortfolioRepository portfolioRepository,
        PositionRepository positionRepository,
        PositionService positionService
    ) {
        this.portfolioRepository = portfolioRepository;
        this.positionRepository = positionRepository;
        this.positionService = positionService;
    }

    public RiskAnalyticsDto computePortfolioRisk(String portfolioId) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
            .orElseThrow(() -> new com.foliolive.core.exception.ResourceNotFoundException("Portfolio not found: " + portfolioId));

        List<Position> positions = positionRepository.findByPortfolioId(portfolioId);

        if (positions.isEmpty()) {
            return buildEmptyAnalytics(portfolio);
        }

        BigDecimal portfolioMarketValue = BigDecimal.ZERO;
        BigDecimal totalCostBasis = BigDecimal.ZERO;
        BigDecimal dailyPnL = BigDecimal.ZERO;

        Map<String, BigDecimal> posMarketValues = new HashMap<>();
        Map<String, BigDecimal> sectorMap = new HashMap<>();
        Map<String, BigDecimal> assetClassMap = new HashMap<>();

        for (Position pos : positions) {
            String symbol = pos.getInstrument().getSymbol();
            BigDecimal markPrice = positionService.getMarkPrice(symbol, pos.getAverageCost());
            BigDecimal prevPrice = getPreviousClosePrice(symbol, markPrice);

            BigDecimal posMv = pos.getQuantity().multiply(markPrice);
            BigDecimal posCost = pos.getQuantity().multiply(pos.getAverageCost());
            BigDecimal posDailyPnL = pos.getQuantity().multiply(markPrice.subtract(prevPrice));

            portfolioMarketValue = portfolioMarketValue.add(posMv);
            totalCostBasis = totalCostBasis.add(posCost);
            dailyPnL = dailyPnL.add(posDailyPnL);

            posMarketValues.put(symbol, posMv);

            String sector = pos.getInstrument().getSector().name();
            sectorMap.put(sector, sectorMap.getOrDefault(sector, BigDecimal.ZERO).add(posMv));

            String assetClass = pos.getInstrument().getAssetClass().name();
            assetClassMap.put(assetClass, assetClassMap.getOrDefault(assetClass, BigDecimal.ZERO).add(posMv));
        }

        BigDecimal cash = portfolio.getCashBalance();
        BigDecimal totalPortfolioValue = portfolioMarketValue.add(cash).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalUnrealizedPnL = portfolioMarketValue.subtract(totalCostBasis).setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalUnrealizedPnLPercent = BigDecimal.ZERO;
        if (totalCostBasis.compareTo(BigDecimal.ZERO) > 0) {
            totalUnrealizedPnLPercent = totalUnrealizedPnL
                .divide(totalCostBasis, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal prevPortfolioValue = portfolioMarketValue.subtract(dailyPnL);
        BigDecimal dailyPnLPercent = BigDecimal.ZERO;
        if (prevPortfolioValue.compareTo(BigDecimal.ZERO) > 0) {
            dailyPnLPercent = dailyPnL
                .divide(prevPortfolioValue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
        }

        // Compute weights
        double mvDouble = portfolioMarketValue.doubleValue();
        double[] weights = new double[positions.size()];
        String[] symbols = new String[positions.size()];

        for (int i = 0; i < positions.size(); i++) {
            Position pos = positions.get(i);
            symbols[i] = pos.getInstrument().getSymbol();
            weights[i] = mvDouble > 0 ? posMarketValues.get(symbols[i]).doubleValue() / mvDouble : 0.0;
        }

        // Concentration Analytics (HHI and Top-N)
        double hhi = calculateHHI(weights);
        double top5Concentration = calculateTopNConcentration(weights, 5);
        double top10Concentration = calculateTopNConcentration(weights, 10);

        // Exposure Maps in Percentages
        Map<String, BigDecimal> sectorExposures = new HashMap<>();
        for (Map.Entry<String, BigDecimal> entry : sectorMap.entrySet()) {
            BigDecimal pct = mvDouble > 0
                ? entry.getValue().divide(portfolioMarketValue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
            sectorExposures.put(entry.getKey(), pct);
        }

        Map<String, BigDecimal> assetClassExposures = new HashMap<>();
        for (Map.Entry<String, BigDecimal> entry : assetClassMap.entrySet()) {
            BigDecimal pct = mvDouble > 0
                ? entry.getValue().divide(portfolioMarketValue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
            assetClassExposures.put(entry.getKey(), pct);
        }

        // Historical simulated returns
        double[][] assetReturns = generateAssetReturns(symbols, HISTORICAL_DAYS);
        double[] benchmarkReturns = generateBenchmarkReturns(HISTORICAL_DAYS);

        // Portfolio scenario returns: R_p,t = sum(w_i * R_i,t)
        double[] portfolioReturns = new double[HISTORICAL_DAYS];
        for (int t = 0; t < HISTORICAL_DAYS; t++) {
            double rDay = 0.0;
            for (int i = 0; i < weights.length; i++) {
                rDay += weights[i] * assetReturns[i][t];
            }
            portfolioReturns[t] = rDay;
        }

        // VaR & CVaR Calculations
        double historicalVaR95 = calculateHistoricalVaR(portfolioReturns, 0.05, mvDouble);
        double historicalVaR99 = calculateHistoricalVaR(portfolioReturns, 0.01, mvDouble);
        double expectedShortfall95 = calculateExpectedShortfall(portfolioReturns, 0.05, mvDouble);
        double expectedShortfall99 = calculateExpectedShortfall(portfolioReturns, 0.01, mvDouble);

        double stdDev = calculateStandardDeviation(portfolioReturns);
        double parametricVaR95 = calculateParametricVaR(mvDouble, stdDev, Z_95);
        double parametricVaR99 = calculateParametricVaR(mvDouble, stdDev, Z_99);

        // Systematic Beta vs Benchmark
        double beta = calculateBeta(portfolioReturns, benchmarkReturns);

        return new RiskAnalyticsDto(
            portfolioId,
            portfolioMarketValue.setScale(2, RoundingMode.HALF_UP),
            cash.setScale(2, RoundingMode.HALF_UP),
            totalPortfolioValue,
            totalUnrealizedPnL,
            totalUnrealizedPnLPercent,
            dailyPnL.setScale(2, RoundingMode.HALF_UP),
            dailyPnLPercent,
            BigDecimal.valueOf(parametricVaR95).setScale(2, RoundingMode.HALF_UP),
            BigDecimal.valueOf(parametricVaR99).setScale(2, RoundingMode.HALF_UP),
            BigDecimal.valueOf(historicalVaR95).setScale(2, RoundingMode.HALF_UP),
            BigDecimal.valueOf(historicalVaR99).setScale(2, RoundingMode.HALF_UP),
            BigDecimal.valueOf(expectedShortfall95).setScale(2, RoundingMode.HALF_UP),
            BigDecimal.valueOf(expectedShortfall99).setScale(2, RoundingMode.HALF_UP),
            Math.round(hhi * 10.0) / 10.0,
            Math.round(top5Concentration * 100.0) / 100.0,
            Math.round(top10Concentration * 100.0) / 100.0,
            Math.round(beta * 100.0) / 100.0,
            sectorExposures,
            assetClassExposures,
            Instant.now()
        );
    }

    // Pure mathematical functions accessible for testing

    public double calculateParametricVaR(double portfolioValue, double stdDev, double zScore) {
        return Math.max(0.0, zScore * stdDev * portfolioValue);
    }

    public double calculateHistoricalVaR(double[] returns, double alpha, double portfolioValue) {
        if (returns == null || returns.length == 0 || portfolioValue <= 0) return 0.0;
        double[] sorted = returns.clone();
        Arrays.sort(sorted);
        int index = (int) Math.floor(alpha * sorted.length);
        index = Math.max(0, Math.min(index, sorted.length - 1));
        double lossReturn = -sorted[index];
        return Math.max(0.0, lossReturn * portfolioValue);
    }

    public double calculateExpectedShortfall(double[] returns, double alpha, double portfolioValue) {
        if (returns == null || returns.length == 0 || portfolioValue <= 0) return 0.0;
        double[] sorted = returns.clone();
        Arrays.sort(sorted);
        int cutoffIndex = (int) Math.floor(alpha * sorted.length);
        cutoffIndex = Math.max(1, Math.min(cutoffIndex, sorted.length));

        double sumLoss = 0.0;
        for (int i = 0; i < cutoffIndex; i++) {
            sumLoss += -sorted[i];
        }
        double avgTailLoss = sumLoss / cutoffIndex;
        return Math.max(0.0, avgTailLoss * portfolioValue);
    }

    public double calculateHHI(double[] weights) {
        if (weights == null || weights.length == 0) return 0.0;
        double sumSq = 0.0;
        for (double w : weights) {
            double pct = w * 100.0;
            sumSq += pct * pct;
        }
        return sumSq;
    }

    public double calculateTopNConcentration(double[] weights, int n) {
        if (weights == null || weights.length == 0) return 0.0;
        double[] sortedDesc = weights.clone();
        Arrays.sort(sortedDesc);
        double topSum = 0.0;
        int count = Math.min(n, sortedDesc.length);
        for (int i = 0; i < count; i++) {
            topSum += sortedDesc[sortedDesc.length - 1 - i];
        }
        return topSum * 100.0;
    }

    public double calculateStandardDeviation(double[] values) {
        if (values == null || values.length <= 1) return 0.0;
        double mean = calculateMean(values);
        double sumSqDiff = 0.0;
        for (double v : values) {
            sumSqDiff += Math.pow(v - mean, 2);
        }
        return Math.sqrt(sumSqDiff / (values.length - 1));
    }

    public double calculateMean(double[] values) {
        if (values == null || values.length == 0) return 0.0;
        double sum = 0.0;
        for (double v : values) sum += v;
        return sum / values.length;
    }

    public double calculateBeta(double[] portfolioReturns, double[] benchmarkReturns) {
        if (portfolioReturns == null || benchmarkReturns == null || portfolioReturns.length != benchmarkReturns.length || portfolioReturns.length <= 1) {
            return 1.0;
        }
        int n = portfolioReturns.length;
        double meanP = calculateMean(portfolioReturns);
        double meanB = calculateMean(benchmarkReturns);

        double cov = 0.0;
        double varB = 0.0;
        for (int t = 0; t < n; t++) {
            double diffP = portfolioReturns[t] - meanP;
            double diffB = benchmarkReturns[t] - meanB;
            cov += diffP * diffB;
            varB += diffB * diffB;
        }

        if (varB <= 1e-12) return 1.0;
        return cov / varB;
    }

    // Deterministic return generator per symbol (using deterministic LCG/Box-Muller)
    public double[][] generateAssetReturns(String[] symbols, int days) {
        double[][] res = new double[symbols.length][days];
        for (int i = 0; i < symbols.length; i++) {
            int seed = Math.abs(symbols[i].hashCode()) + 1000;
            Random rng = new Random(seed);
            double dailyVol = getDailyVolatility(symbols[i]);
            double dailyDrift = 0.0003; // ~7.5% annual return
            for (int d = 0; d < days; d++) {
                res[i][d] = dailyDrift + rng.nextGaussian() * dailyVol;
            }
        }
        return res;
    }

    public double[] generateBenchmarkReturns(int days) {
        double[] b = new double[days];
        Random rng = new Random(424242);
        double dailyVol = 0.16 / Math.sqrt(252); // ~1.0% daily benchmark volatility
        double dailyDrift = 0.00035;
        for (int d = 0; d < days; d++) {
            b[d] = dailyDrift + rng.nextGaussian() * dailyVol;
        }
        return b;
    }

    private double getDailyVolatility(String symbol) {
        double annualVol = switch (symbol.toUpperCase()) {
            case "NVDA", "TSLA" -> 0.45;
            case "AMZN", "META" -> 0.30;
            case "AAPL", "GOOGL", "MSFT" -> 0.22;
            case "JPM", "GS" -> 0.20;
            case "XOM", "CVX", "GLD" -> 0.16;
            case "TLT" -> 0.12;
            case "BND", "AGG" -> 0.05;
            default -> 0.25;
        };
        return annualVol / Math.sqrt(252);
    }

    private BigDecimal getPreviousClosePrice(String symbol, BigDecimal markPrice) {
        double factor = switch (symbol.toUpperCase()) {
            case "AAPL" -> 0.992;
            case "MSFT" -> 0.988;
            case "NVDA" -> 0.975;
            case "GOOGL" -> 0.991;
            default -> 0.995;
        };
        return markPrice.multiply(BigDecimal.valueOf(factor)).setScale(2, RoundingMode.HALF_UP);
    }

    private RiskAnalyticsDto buildEmptyAnalytics(Portfolio p) {
        BigDecimal cash = p.getCashBalance().setScale(2, RoundingMode.HALF_UP);
        return new RiskAnalyticsDto(
            p.getId(),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            cash,
            cash,
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
            0.0,
            0.0,
            0.0,
            0.0,
            Collections.emptyMap(),
            Collections.emptyMap(),
            Instant.now()
        );
    }
}
