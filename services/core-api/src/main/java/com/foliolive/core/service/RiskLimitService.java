package com.foliolive.core.service;

import com.foliolive.core.dto.RiskLimitDto;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.RiskLimit;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.RiskLimitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class RiskLimitService {

    private final RiskLimitRepository riskLimitRepository;
    private final PortfolioRepository portfolioRepository;

    public RiskLimitService(RiskLimitRepository riskLimitRepository, PortfolioRepository portfolioRepository) {
        this.riskLimitRepository = riskLimitRepository;
        this.portfolioRepository = portfolioRepository;
    }

    public List<RiskLimitDto.Response> findByPortfolio(String portfolioId) {
        return riskLimitRepository.findByPortfolioId(portfolioId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional
    public RiskLimitDto.Response createRiskLimit(String portfolioId, RiskLimitDto.Create request) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
            .orElseThrow(() -> new ResourceNotFoundException("Portfolio not found: " + portfolioId));

        RiskLimit limit = new RiskLimit(
            "lim_" + UUID.randomUUID().toString().substring(0, 8),
            portfolio,
            request.type(),
            request.threshold(),
            request.unit(),
            request.enabled()
        );

        RiskLimit saved = riskLimitRepository.save(limit);
        return toDto(saved);
    }

    @Transactional
    public RiskLimitDto.Response updateRiskLimit(String portfolioId, String limitId, RiskLimitDto.Create request) {
        RiskLimit limit = riskLimitRepository.findById(limitId)
            .orElseThrow(() -> new ResourceNotFoundException("Risk limit not found: " + limitId));

        if (!limit.getPortfolio().getId().equals(portfolioId)) {
            throw new ResourceNotFoundException("Risk limit does not belong to portfolio: " + portfolioId);
        }

        limit.setType(request.type());
        limit.setThreshold(request.threshold());
        limit.setUnit(request.unit());
        limit.setEnabled(request.enabled());
        limit.setUpdatedAt(Instant.now());

        RiskLimit saved = riskLimitRepository.save(limit);
        return toDto(saved);
    }

    @Transactional
    public void deleteRiskLimit(String portfolioId, String limitId) {
        RiskLimit limit = riskLimitRepository.findById(limitId)
            .orElseThrow(() -> new ResourceNotFoundException("Risk limit not found: " + limitId));

        if (!limit.getPortfolio().getId().equals(portfolioId)) {
            throw new ResourceNotFoundException("Risk limit does not belong to portfolio: " + portfolioId);
        }

        riskLimitRepository.delete(limit);
    }

    private RiskLimitDto.Response toDto(RiskLimit l) {
        return new RiskLimitDto.Response(
            l.getId(),
            l.getPortfolio().getId(),
            l.getType(),
            l.getThreshold(),
            l.getUnit(),
            l.isEnabled(),
            l.getCreatedAt(),
            l.getUpdatedAt()
        );
    }
}
