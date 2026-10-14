package com.foliolive.core.service;

import com.foliolive.core.dto.AlertDto;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Alert;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.RiskLimit;
import com.foliolive.core.repository.AlertRepository;
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
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @InjectMocks
    private AlertService alertService;

    private Portfolio portfolio;
    private Alert alert;

    @BeforeEach
    void setUp() {
        portfolio = new Portfolio("port_01", "Global Alpha", "Desc", "USD", BigDecimal.valueOf(5000000), null);
        alert = new Alert(
            "alt_01",
            portfolio,
            null,
            "VAR_BREACH",
            Alert.AlertSeverity.CRITICAL,
            "VaR 95% Breach",
            "VaR 95% exceeded limit",
            BigDecimal.valueOf(125000),
            BigDecimal.valueOf(100000),
            "USD"
        );
    }

    @Test
    @DisplayName("findAlerts returns alerts with acknowledged filter")
    void testFindAlertsWithAcknowledgedFilter() {
        when(alertRepository.findByPortfolioIdAndAcknowledgedOrderByCreatedAtDesc("port_01", false))
            .thenReturn(List.of(alert));

        List<AlertDto> result = alertService.findAlerts("port_01", false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo("alt_01");
        assertThat(result.get(0).acknowledged()).isFalse();
        assertThat(result.get(0).severity()).isEqualTo(Alert.AlertSeverity.CRITICAL);
    }

    @Test
    @DisplayName("findAlerts returns all alerts when filter is null")
    void testFindAlertsWithoutFilter() {
        when(alertRepository.findByPortfolioIdOrderByCreatedAtDesc("port_01"))
            .thenReturn(List.of(alert));

        List<AlertDto> result = alertService.findAlerts("port_01", null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo("alt_01");
    }

    @Test
    @DisplayName("acknowledgeAlert marks alert as acknowledged")
    void testAcknowledgeAlertSuccess() {
        when(alertRepository.findById("alt_01")).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        AlertDto result = alertService.acknowledgeAlert("alt_01");

        assertThat(result.acknowledged()).isTrue();
        verify(alertRepository, times(1)).save(alert);
    }

    @Test
    @DisplayName("acknowledgeAlert throws ResourceNotFoundException if alert not found")
    void testAcknowledgeAlertNotFound() {
        when(alertRepository.findById("alt_unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> alertService.acknowledgeAlert("alt_unknown"))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Alert not found: alt_unknown");
    }
}
