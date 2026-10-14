package com.foliolive.core.service;

import com.foliolive.core.dto.InstrumentDto;
import com.foliolive.core.exception.BusinessValidationException;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.repository.InstrumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class InstrumentService {

    private final InstrumentRepository instrumentRepository;

    public InstrumentService(InstrumentRepository instrumentRepository) {
        this.instrumentRepository = instrumentRepository;
    }

    public List<Instrument> findAll(Instrument.AssetClass assetClass, Instrument.Sector sector) {
        if (assetClass != null && sector != null) {
            return instrumentRepository.findByAssetClassAndSector(assetClass, sector);
        } else if (assetClass != null) {
            return instrumentRepository.findByAssetClass(assetClass);
        } else if (sector != null) {
            return instrumentRepository.findBySector(sector);
        }
        return instrumentRepository.findAll();
    }

    public Instrument findBySymbol(String symbol) {
        return instrumentRepository.findById(symbol.toUpperCase())
            .orElseThrow(() -> new ResourceNotFoundException("Instrument symbol not found: " + symbol));
    }

    @Transactional
    public Instrument createInstrument(InstrumentDto dto) {
        String sym = dto.symbol().trim().toUpperCase();
        if (instrumentRepository.existsById(sym)) {
            throw new BusinessValidationException("Instrument with symbol " + sym + " already exists");
        }
        Instrument instrument = new Instrument(
            sym,
            dto.name(),
            dto.assetClass(),
            dto.sector(),
            dto.currency()
        );
        return instrumentRepository.save(instrument);
    }
}
