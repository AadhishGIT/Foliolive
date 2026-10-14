package com.foliolive.core.controller;

import com.foliolive.core.dto.PortfolioCreateDto;
import com.foliolive.core.dto.PortfolioDto;
import com.foliolive.core.service.PortfolioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolios")
@Tag(name = "Portfolios", description = "Institutional portfolio management and lifecycle")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "List all portfolios")
    public ResponseEntity<List<PortfolioDto>> getAllPortfolios() {
        return ResponseEntity.ok(portfolioService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "Get portfolio details by ID")
    public ResponseEntity<PortfolioDto> getPortfolioById(@PathVariable String id) {
        return ResponseEntity.ok(portfolioService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Create a new portfolio (PM only)")
    public ResponseEntity<PortfolioDto> createPortfolio(
        @Valid @RequestBody PortfolioCreateDto request,
        @AuthenticationPrincipal String username
    ) {
        PortfolioDto created = portfolioService.createPortfolio(request, username != null ? username : "pm_demo");
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Update portfolio settings (PM only)")
    public ResponseEntity<PortfolioDto> updatePortfolio(
        @PathVariable String id,
        @Valid @RequestBody PortfolioCreateDto request
    ) {
        return ResponseEntity.ok(portfolioService.updatePortfolio(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Delete portfolio (PM only)")
    public ResponseEntity<Void> deletePortfolio(@PathVariable String id) {
        portfolioService.deletePortfolio(id);
        return ResponseEntity.noContent().build();
    }
}
