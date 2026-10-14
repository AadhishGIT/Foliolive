package com.foliolive.core.controller;

import com.foliolive.core.dto.InstrumentDto;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.service.InstrumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/instruments")
@Tag(name = "Instruments", description = "Financial assets and reference data directory")
public class InstrumentController {

    private final InstrumentService instrumentService;

    public InstrumentController(InstrumentService instrumentService) {
        this.instrumentService = instrumentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "List all traded instruments, filterable by asset class and sector")
    public ResponseEntity<List<Instrument>> getInstruments(
        @RequestParam(required = false) Instrument.AssetClass assetClass,
        @RequestParam(required = false) Instrument.Sector sector
    ) {
        return ResponseEntity.ok(instrumentService.findAll(assetClass, sector));
    }

    @GetMapping("/{symbol}")
    @PreAuthorize("hasAnyRole('PM', 'VIEWER')")
    @Operation(summary = "Get instrument reference details by symbol")
    public ResponseEntity<Instrument> getInstrumentBySymbol(@PathVariable String symbol) {
        return ResponseEntity.ok(instrumentService.findBySymbol(symbol));
    }

    @PostMapping
    @PreAuthorize("hasRole('PM')")
    @Operation(summary = "Register a new instrument into the directory (PM only)")
    public ResponseEntity<Instrument> createInstrument(@Valid @RequestBody InstrumentDto request) {
        Instrument created = instrumentService.createInstrument(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
