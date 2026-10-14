package com.foliolive.core.controller;

import com.foliolive.core.dto.TradeDto;
import com.foliolive.core.service.TradeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/trades")
@Tag(name = "Trades", description = "Trade execution and transaction history")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "Get historical trades for a portfolio")
    public ResponseEntity<Page<TradeDto.Response>> getTrades(
        @PathVariable String portfolioId,
        @PageableDefault(size = 20, sort = "executedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(tradeService.findTradesPaginated(portfolioId, pageable));
    }

    @PostMapping
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Execute a new trade and rebalance portfolio position (PM only)")
    public ResponseEntity<TradeDto.Response> executeTrade(
        @PathVariable String portfolioId,
        @Valid @RequestBody TradeDto.Create request
    ) {
        TradeDto.Response trade = tradeService.executeTrade(portfolioId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(trade);
    }
}
