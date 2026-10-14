package com.foliolive.core.controller;

import com.foliolive.core.dto.RiskLimitDto;
import com.foliolive.core.service.RiskLimitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/risk-limits")
@Tag(name = "Risk Limits", description = "Risk limit policy rules CRUD")
public class RiskLimitController {

    private final RiskLimitService riskLimitService;

    public RiskLimitController(RiskLimitService riskLimitService) {
        this.riskLimitService = riskLimitService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "Get risk limits defined for a portfolio")
    public ResponseEntity<List<RiskLimitDto.Response>> getRiskLimits(@PathVariable String portfolioId) {
        return ResponseEntity.ok(riskLimitService.findByPortfolio(portfolioId));
    }

    @PostMapping
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Create a risk limit rule for a portfolio (PM only)")
    public ResponseEntity<RiskLimitDto.Response> createRiskLimit(
        @PathVariable String portfolioId,
        @Valid @RequestBody RiskLimitDto.Create request
    ) {
        RiskLimitDto.Response created = riskLimitService.createRiskLimit(portfolioId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{limitId}")
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Update an existing risk limit rule (PM only)")
    public ResponseEntity<RiskLimitDto.Response> updateRiskLimit(
        @PathVariable String portfolioId,
        @PathVariable String limitId,
        @Valid @RequestBody RiskLimitDto.Create request
    ) {
        return ResponseEntity.ok(riskLimitService.updateRiskLimit(portfolioId, limitId, request));
    }

    @DeleteMapping("/{limitId}")
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Delete a risk limit rule (PM only)")
    public ResponseEntity<Void> deleteRiskLimit(
        @PathVariable String portfolioId,
        @PathVariable String limitId
    ) {
        riskLimitService.deleteRiskLimit(portfolioId, limitId);
        return ResponseEntity.noContent().build();
    }
}
