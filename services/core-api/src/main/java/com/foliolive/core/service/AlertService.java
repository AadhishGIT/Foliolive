package com.foliolive.core.service;

import com.foliolive.core.dto.AlertDto;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Alert;
import com.foliolive.core.repository.AlertRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AlertService {

    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public List<AlertDto> findAlerts(String portfolioId, Boolean acknowledged) {
        List<Alert> alerts;
        if (acknowledged != null) {
            alerts = alertRepository.findByPortfolioIdAndAcknowledgedOrderByCreatedAtDesc(portfolioId, acknowledged);
        } else {
            alerts = alertRepository.findByPortfolioIdOrderByCreatedAtDesc(portfolioId);
        }
        return alerts.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public AlertDto acknowledgeAlert(String alertId) {
        Alert alert = alertRepository.findById(alertId)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));

        alert.setAcknowledged(true);
        Alert saved = alertRepository.save(alert);
        return toDto(saved);
    }

    private AlertDto toDto(Alert a) {
        return new AlertDto(
            a.getId(),
            a.getPortfolio().getId(),
            a.getRiskLimit() != null ? a.getRiskLimit().getId() : null,
            a.getType(),
            a.getSeverity(),
            a.getTitle(),
            a.getMessage(),
            a.getCurrentValue(),
            a.getThresholdValue(),
            a.getUnit(),
            a.isAcknowledged(),
            a.getCreatedAt()
        );
    }
}
