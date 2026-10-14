package com.foliolive.core.service;

import com.foliolive.core.dto.PortfolioCreateDto;
import com.foliolive.core.dto.PortfolioDto;
import com.foliolive.core.exception.ResourceNotFoundException;
import com.foliolive.core.model.Portfolio;
import com.foliolive.core.model.User;
import com.foliolive.core.repository.PortfolioRepository;
import com.foliolive.core.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PortfolioService portfolioService;

    private User user;
    private Portfolio portfolio;

    @BeforeEach
    void setUp() {
        user = new User("usr_pm", "pm_demo", "hashed", "pm@foliolive.internal", "Portfolio Manager", User.Role.ROLE_PM);
        portfolio = new Portfolio("port_01", "Global Alpha Fund", "Multi-asset hedge fund", "USD", BigDecimal.valueOf(5000000), user);
    }

    @Test
    @DisplayName("findAll returns list of PortfolioDto")
    void testFindAll() {
        when(portfolioRepository.findAll()).thenReturn(List.of(portfolio));

        List<PortfolioDto> result = portfolioService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo("port_01");
        assertThat(result.get(0).name()).isEqualTo("Global Alpha Fund");
        assertThat(result.get(0).currency()).isEqualTo("USD");
        assertThat(result.get(0).cashBalance()).isEqualByComparingTo(BigDecimal.valueOf(5000000));
        verify(portfolioRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("findById returns PortfolioDto when found")
    void testFindByIdSuccess() {
        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));

        PortfolioDto result = portfolioService.findById("port_01");

        assertThat(result.id()).isEqualTo("port_01");
        assertThat(result.name()).isEqualTo("Global Alpha Fund");
    }

    @Test
    @DisplayName("findById throws ResourceNotFoundException when missing")
    void testFindByIdNotFound() {
        when(portfolioRepository.findById("port_missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.findById("port_missing"))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Portfolio not found: port_missing");
    }

    @Test
    @DisplayName("createPortfolio saves and returns new portfolio")
    void testCreatePortfolio() {
        PortfolioCreateDto createDto = new PortfolioCreateDto("New Tech Fund", "Tech focused", "USD", BigDecimal.valueOf(1000000));
        when(userRepository.findByUsername("pm_demo")).thenReturn(Optional.of(user));
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(inv -> inv.getArgument(0));

        PortfolioDto result = portfolioService.createPortfolio(createDto, "pm_demo");

        assertThat(result.name()).isEqualTo("New Tech Fund");
        assertThat(result.description()).isEqualTo("Tech focused");
        assertThat(result.currency()).isEqualTo("USD");
        assertThat(result.cashBalance()).isEqualByComparingTo(BigDecimal.valueOf(1000000));
        assertThat(result.createdByUserId()).isEqualTo("usr_pm");
        verify(portfolioRepository, times(1)).save(any(Portfolio.class));
    }

    @Test
    @DisplayName("updatePortfolio updates fields and returns updated DTO")
    void testUpdatePortfolio() {
        PortfolioCreateDto updateDto = new PortfolioCreateDto("Updated Fund", "Updated desc", "EUR", BigDecimal.valueOf(2000000));
        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(inv -> inv.getArgument(0));

        PortfolioDto result = portfolioService.updatePortfolio("port_01", updateDto);

        assertThat(result.name()).isEqualTo("Updated Fund");
        assertThat(result.currency()).isEqualTo("EUR");
        assertThat(result.cashBalance()).isEqualByComparingTo(BigDecimal.valueOf(2000000));
    }

    @Test
    @DisplayName("deletePortfolio deletes entity when found")
    void testDeletePortfolio() {
        when(portfolioRepository.findById("port_01")).thenReturn(Optional.of(portfolio));

        portfolioService.deletePortfolio("port_01");

        verify(portfolioRepository, times(1)).delete(portfolio);
    }
}
