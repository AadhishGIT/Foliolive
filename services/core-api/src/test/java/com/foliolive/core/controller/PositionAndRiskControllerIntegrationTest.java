package com.foliolive.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foliolive.core.config.JwtService;
import com.foliolive.core.dto.TradeDto;
import com.foliolive.core.model.Trade;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PositionAndRiskControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    private String pmToken;

    @BeforeEach
    void setUp() {
        pmToken = "Bearer " + jwtService.generateToken("pm_demo", "ROLE_PM");
    }

    @Test
    @DisplayName("GET /api/v1/portfolios/port_global_alpha_01/positions returns paginated positions")
    void testGetPositionsPaginated() throws Exception {
        mockMvc.perform(get("/api/v1/portfolios/port_global_alpha_01/positions?page=0&size=5")
                .header("Authorization", pmToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(lessThanOrEqualTo(5))))
            .andExpect(jsonPath("$.totalElements", greaterThan(0)))
            .andExpect(jsonPath("$.content[0].currentPrice", notNullValue()))
            .andExpect(jsonPath("$.content[0].marketValue", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/v1/portfolios/port_stress_test_large_03/positions handles large portfolio pagination")
    void testGetStressTestPositions() throws Exception {
        mockMvc.perform(get("/api/v1/portfolios/port_stress_test_large_03/positions?page=0&size=50")
                .header("Authorization", pmToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(50)))
            .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(500)));
    }

    @Test
    @DisplayName("GET /api/v1/portfolios/port_global_alpha_01/risk returns risk analytics metrics")
    void testGetPortfolioRisk() throws Exception {
        mockMvc.perform(get("/api/v1/portfolios/port_global_alpha_01/risk")
                .header("Authorization", pmToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.portfolioId", is("port_global_alpha_01")))
            .andExpect(jsonPath("$.totalPortfolioValue", notNullValue()))
            .andExpect(jsonPath("$.parametricVaR95", notNullValue()))
            .andExpect(jsonPath("$.parametricVaR99", notNullValue()))
            .andExpect(jsonPath("$.historicalVaR95", notNullValue()))
            .andExpect(jsonPath("$.historicalVaR99", notNullValue()))
            .andExpect(jsonPath("$.expectedShortfall95", notNullValue()))
            .andExpect(jsonPath("$.herfindahlHirschmanIndex", notNullValue()))
            .andExpect(jsonPath("$.beta", notNullValue()))
            .andExpect(jsonPath("$.assetClassExposures", notNullValue()))
            .andExpect(jsonPath("$.sectorExposures", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/v1/instruments returns seed instruments")
    void testGetInstruments() throws Exception {
        mockMvc.perform(get("/api/v1/instruments")
                .header("Authorization", pmToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(25))))
            .andExpect(jsonPath("$[*].symbol", hasItem("AAPL")))
            .andExpect(jsonPath("$[*].symbol", hasItem("NVDA")));
    }

    @Test
    @DisplayName("POST /api/v1/portfolios/port_global_alpha_01/trades executes a valid trade")
    void testExecuteTradeSuccess() throws Exception {
        TradeDto.Create request = new TradeDto.Create("AAPL", Trade.TradeSide.BUY, BigDecimal.valueOf(10), BigDecimal.valueOf(180.00));

        mockMvc.perform(post("/api/v1/portfolios/port_global_alpha_01/trades")
                .header("Authorization", pmToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.portfolioId", is("port_global_alpha_01")))
            .andExpect(jsonPath("$.symbol", is("AAPL")))
            .andExpect(jsonPath("$.side", is("BUY")))
            .andExpect(jsonPath("$.quantity", is(10)))
            .andExpect(jsonPath("$.price", is(180.00)))
            .andExpect(jsonPath("$.totalAmount", is(1800.00)));
    }
}
