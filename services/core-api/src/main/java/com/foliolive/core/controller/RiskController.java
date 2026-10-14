package com.foliolive.core.controller;

import com.foliolive.core.dto.RiskAnalyticsDto;
import com.foliolive.core.service.RiskCalculationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/risk")
@Tag(name = "Risk Engine", description = "Quantitative risk analytics, VaR models, and exposure metrics")
public class RiskController {

    private final RiskCalculationService riskCalculationService;

    public RiskController(RiskCalculationService riskCalculationService) {
        this.riskCalculationService = riskCalculationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "Calculate and return comprehensive portfolio risk metrics (VaR 95/99, CVaR, HHI, Beta, Exposures)")
    public ResponseEntity<RiskAnalyticsDto> getPortfolioRisk(@PathVariable String portfolioId) {
        return ResponseEntity.ok(riskCalculationService.computePortfolioRisk(portfolioId));
    }
}
