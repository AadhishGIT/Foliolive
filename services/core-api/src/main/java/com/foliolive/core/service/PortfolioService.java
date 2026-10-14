package com.foliolive.core.service;

import com.foliolive.core.dto.PortfolioCreateDto;
import com.foliolive.core.dto.PortfolioDto;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.User;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final UserRepository userRepository;

    public PortfolioService(PortfolioRepository portfolioRepository, UserRepository userRepository) {
        this.portfolioRepository = portfolioRepository;
        this.userRepository = userRepository;
    }

    public List<PortfolioDto> findAll() {
        return portfolioRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    public PortfolioDto findById(String id) {
        Portfolio portfolio = getEntity(id);
        return toDto(portfolio);
    }

    public Portfolio getEntity(String id) {
        return portfolioRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Portfolio not found: " + id));
    }

    @Transactional
    public PortfolioDto createPortfolio(PortfolioCreateDto dto, String username) {
        User creator = userRepository.findByUsername(username).orElse(null);
        String id = "port_" + UUID.randomUUID().toString().substring(0, 8);

        Portfolio portfolio = new Portfolio(
            id,
            dto.name(),
            dto.description(),
            dto.currency(),
            dto.cashBalance(),
            creator
        );

        Portfolio saved = portfolioRepository.save(portfolio);
        return toDto(saved);
    }

    @Transactional
    public PortfolioDto updatePortfolio(String id, PortfolioCreateDto dto) {
        Portfolio portfolio = getEntity(id);
        portfolio.setName(dto.name());
        portfolio.setDescription(dto.description());
        portfolio.setCurrency(dto.currency());
        portfolio.setCashBalance(dto.cashBalance());
        portfolio.setUpdatedAt(Instant.now());

        Portfolio updated = portfolioRepository.save(portfolio);
        return toDto(updated);
    }

    @Transactional
    public void deletePortfolio(String id) {
        Portfolio portfolio = getEntity(id);
        portfolioRepository.delete(portfolio);
    }

    private PortfolioDto toDto(Portfolio p) {
        return new PortfolioDto(
            p.getId(),
            p.getName(),
            p.getDescription(),
            p.getCurrency(),
            p.getCashBalance(),
            p.getCreatedBy() != null ? p.getCreatedBy().getId() : null,
            p.getPositions() != null ? p.getPositions().size() : 0,
            p.getCreatedAt(),
            p.getUpdatedAt()
        );
    }
}
