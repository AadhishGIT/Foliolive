package com.foliolive.core.controller;

import com.foliolive.core.dto.PositionDto;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.service.PositionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/positions")
@Tag(name = "Positions", description = "Portfolio asset allocations and positions")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "Get paginated, filterable, and sortable portfolio positions")
    public ResponseEntity<Page<PositionDto>> getPositions(
        @PathVariable String portfolioId,
        @Parameter(description = "Filter by symbol substring")
        @RequestParam(required = false) String symbol,
        @Parameter(description = "Filter by asset class (EQUITY, FIXED_INCOME, COMMODITY)")
        @RequestParam(required = false) Instrument.AssetClass assetClass,
        @Parameter(description = "Filter by sector")
        @RequestParam(required = false) Instrument.Sector sector,
        @PageableDefault(size = 50, sort = "quantity", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(positionService.findPositions(portfolioId, symbol, assetClass, sector, pageable));
    }
}
