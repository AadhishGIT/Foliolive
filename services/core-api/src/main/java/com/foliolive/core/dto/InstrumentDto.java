package com.foliolive.core.dto;

import com.foliolive.core.model.Instrument;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InstrumentDto(
    @NotBlank(message = "Symbol is required")
    String symbol,

    @NotBlank(message = "Name is required")
    String name,

    @NotNull(message = "Asset class is required")
    Instrument.AssetClass assetClass,

    @NotNull(message = "Sector is required")
    Instrument.Sector sector,

    @NotBlank(message = "Currency is required")
    String currency
) {}
