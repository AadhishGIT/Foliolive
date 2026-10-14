package com.foliolive.core.service;

import com.foliolive.core.dto.RiskLimitDto;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.RiskLimit;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.RiskLimitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RiskLimitServiceTest {

    @Mock
    private RiskLimitRepository riskLimitRepository;

    @Mock
    private PortfolioRepository portfolioRepository;

    @InjectMocks
    private RiskLimitService riskLimitService;

    private Portfolio portfolio;
    private RiskLimit riskLimit;

    @BeforeEach
    void setUp() {
        portfolio = new Portfolio("port_01", "Global Alpha", "Desc", "USD", BigDecimal.valueOf(5000000), null);
        riskLimit = new RiskLimit("lim_01", portfolio, RiskLimit.LimitType.VAR_95, BigDecimal.valueOf(100000), "USD", true);
    }

    @Test
    @DisplayName("findByPortfolio returns list of RiskLimitDto.Response")
    void testFindByPortfolio() {
        when(riskLimitRepository.findByPortfolioId("port_01")).thenReturn(List.of(riskLimit));

        List<RiskLimitDto.Response> result = riskLimitService.findByPortfolio("port_01");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo("lim_01");
        assertThat(result.get(0).portfolioId()).isEqualTo("port_01");
        assertThat(result.get(0).type()).isEqualTo(RiskLimit.LimitType.VAR_95);
        assertThat(result.get(0).threshold()).isEqualByComparingTo(BigDecimal.valueOf(100000));
    }

    @Test
    @DisplayName("createRiskLimit creates and returns new limit")
    void testCreateRiskLimitSuccess() {
        RiskLimitDto.Create request = new RiskLimitDto.Create(RiskLimit.LimitType.LEVERAGE, BigDecimal.valueOf(2.5), "RATIO", true);
        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));
        when(riskLimitRepository.save(any(RiskLimit.class))).thenAnswer(inv -> inv.getArgument(0));

        RiskLimitDto.Response result = riskLimitService.createRiskLimit("port_01", request);

        assertThat(result.type()).isEqualTo(RiskLimit.LimitType.LEVERAGE);
        assertThat(result.threshold()).isEqualByComparingTo(BigDecimal.valueOf(2.5));
        assertThat(result.unit()).isEqualTo("RATIO");
    }

    @Test
    @DisplayName("createRiskLimit throws ResourceNotFoundException if portfolio not found")
    void testCreateRiskLimitPortfolioNotFound() {
        RiskLimitDto.Create request = new RiskLimitDto.Create(RiskLimit.LimitType.LEVERAGE, BigDecimal.valueOf(2.5), "RATIO", true);
        when(portfolioRepository.findById("port_unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> riskLimitService.createRiskLimit("port_unknown", request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateRiskLimit updates limit and returns updated DTO")
    void testUpdateRiskLimitSuccess() {
        RiskLimitDto.Create request = new RiskLimitDto.Create(RiskLimit.LimitType.VAR_95, BigDecimal.valueOf(120000), "USD", false);
        when(riskLimitRepository.findById("lim_01")).thenReturn(Optional.of(riskLimit));
        when(riskLimitRepository.save(any(RiskLimit.class))).thenAnswer(inv -> inv.getArgument(0));

        RiskLimitDto.Response result = riskLimitService.updateRiskLimit("port_01", "lim_01", request);

        assertThat(result.threshold()).isEqualByComparingTo(BigDecimal.valueOf(120000));
        assertThat(result.enabled()).isFalse();
    }

    @Test
    @DisplayName("updateRiskLimit throws ResourceNotFoundException on portfolio mismatch")
    void testUpdateRiskLimitMismatch() {
        RiskLimitDto.Create request = new RiskLimitDto.Create(RiskLimit.LimitType.VAR_95, BigDecimal.valueOf(120000), "USD", false);
        when(riskLimitRepository.findById("lim_01")).thenReturn(Optional.of(riskLimit));

        assertThatThrownBy(() -> riskLimitService.updateRiskLimit("port_other", "lim_01", request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteRiskLimit deletes limit")
    void testDeleteRiskLimitSuccess() {
        when(riskLimitRepository.findById("lim_01")).thenReturn(Optional.of(riskLimit));

        riskLimitService.deleteRiskLimit("port_01", "lim_01");

        verify(riskLimitRepository, times(1)).delete(riskLimit);
    }
}
