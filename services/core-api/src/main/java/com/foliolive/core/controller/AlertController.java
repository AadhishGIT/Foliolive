package com.foliolive.core.controller;

import com.foliolive.core.dto.AlertDto;
import com.foliolive.core.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Alerts", description = "Risk breach audit trail and acknowledgment")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping("/portfolios/{portfolioId}/alerts")
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "Get risk breach alerts for a portfolio")
    public ResponseEntity<List<AlertDto>> getPortfolioAlerts(
        @PathVariable String portfolioId,
        @RequestParam(required = false) Boolean acknowledged
    ) {
        return ResponseEntity.ok(alertService.findAlerts(portfolioId, acknowledged));
    }

    @PostMapping("/alerts/{alertId}/acknowledge")
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Acknowledge a risk breach alert (PM only)")
    public ResponseEntity<AlertDto> acknowledgeAlert(@PathVariable String alertId) {
        return ResponseEntity.ok(alertService.acknowledgeAlert(alertId));
    }
}
