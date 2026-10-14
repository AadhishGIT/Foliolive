package com.foliolive.core.service;

import com.foliolive.core.dto.InstrumentDto;
import com.foliolive.core.exception.BusinessValidationException;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Instrument;
import com.foliolive.core.repository.InstrumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InstrumentServiceTest {

    @Mock
    private InstrumentRepository instrumentRepository;

    @InjectMocks
    private InstrumentService instrumentService;

    private Instrument instrument;

    @BeforeEach
    void setUp() {
        instrument = new Instrument("AAPL", "Apple Inc.", Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY, "USD");
    }

    @Test
    @DisplayName("findAll without filters returns all instruments")
    void testFindAllUnfiltered() {
        when(instrumentRepository.findAll()).thenReturn(List.of(instrument));

        List<Instrument> result = instrumentService.findAll(null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSymbol()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("findAll with assetClass and sector filters")
    void testFindAllBothFilters() {
        when(instrumentRepository.findByAssetClassAndSector(Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY))
            .thenReturn(List.of(instrument));

        List<Instrument> result = instrumentService.findAll(Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("findAll with assetClass filter only")
    void testFindAllAssetClassFilter() {
        when(instrumentRepository.findByAssetClass(Instrument.AssetClass.EQUITY))
            .thenReturn(List.of(instrument));

        List<Instrument> result = instrumentService.findAll(Instrument.AssetClass.EQUITY, null);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("findAll with sector filter only")
    void testFindAllSectorFilter() {
        when(instrumentRepository.findBySector(Instrument.Sector.TECHNOLOGY))
            .thenReturn(List.of(instrument));

        List<Instrument> result = instrumentService.findAll(null, Instrument.Sector.TECHNOLOGY);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("findBySymbol returns instrument when exists")
    void testFindBySymbolSuccess() {
        when(instrumentRepository.findById("AAPL")).thenReturn(Optional.of(instrument));

        Instrument result = instrumentService.findBySymbol("aapl");

        assertThat(result.getSymbol()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("findBySymbol throws ResourceNotFoundException when missing")
    void testFindBySymbolNotFound() {
        when(instrumentRepository.findById("XYZ")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.findBySymbol("XYZ"))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Instrument symbol not found: XYZ");
    }

    @Test
    @DisplayName("createInstrument creates and saves new instrument")
    void testCreateInstrumentSuccess() {
        InstrumentDto dto = new InstrumentDto("TSLA", "Tesla Inc.", Instrument.AssetClass.EQUITY, Instrument.Sector.CONSUMER_DISCRETIONARY, "USD");
        when(instrumentRepository.existsById("TSLA")).thenReturn(false);
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        Instrument result = instrumentService.createInstrument(dto);

        assertThat(result.getSymbol()).isEqualTo("TSLA");
        assertThat(result.getName()).isEqualTo("Tesla Inc.");
        verify(instrumentRepository, times(1)).save(any(Instrument.class));
    }

    @Test
    @DisplayName("createInstrument throws BusinessValidationException if symbol already exists")
    void testCreateInstrumentDuplicate() {
        InstrumentDto dto = new InstrumentDto("AAPL", "Apple Inc.", Instrument.AssetClass.EQUITY, Instrument.Sector.TECHNOLOGY, "USD");
        when(instrumentRepository.existsById("AAPL")).thenReturn(true);

        assertThatThrownBy(() -> instrumentService.createInstrument(dto))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("already exists");
    }
}
