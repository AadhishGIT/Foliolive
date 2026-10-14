package com.foliolive.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foliolive.core.config.JwtService;
import com.foliolive.core.dto.PortfolioCreateDto;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PortfolioControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    private String pmToken;
    private String viewerToken;

    @BeforeEach
    void setUp() {
        pmToken = "Bearer " + jwtService.generateToken("pm_demo", "ROLE_PM");
        viewerToken = "Bearer " + jwtService.generateToken("viewer_demo", "ROLE_VIEWER");
    }

    @Test
    @DisplayName("GET /api/v1/portfolios without token is rejected")
    void testGetPortfoliosUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/portfolios"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/v1/portfolios with VIEWER token returns portfolios")
    void testGetPortfoliosAsViewer() throws Exception {
        mockMvc.perform(get("/api/v1/portfolios")
                .header("Authorization", viewerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
            .andExpect(jsonPath("$[*].id", hasItem("port_global_alpha_01")));
    }

    @Test
    @DisplayName("GET /api/v1/portfolios with PM token returns portfolios")
    void testGetPortfoliosAsPm() throws Exception {
        mockMvc.perform(get("/api/v1/portfolios")
                .header("Authorization", pmToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
            .andExpect(jsonPath("$[*].id", hasItem("port_stress_test_large_03")));
    }

    @Test
    @DisplayName("POST /api/v1/portfolios as VIEWER is forbidden (403)")
    void testCreatePortfolioForbiddenForViewer() throws Exception {
        PortfolioCreateDto dto = new PortfolioCreateDto("Quant Macro Fund", "Macro strategies", "USD", BigDecimal.valueOf(1000000));

        mockMvc.perform(post("/api/v1/portfolios")
                .header("Authorization", viewerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/portfolios as PM succeeds with 201 Created")
    void testCreatePortfolioSuccessForPm() throws Exception {
        PortfolioCreateDto dto = new PortfolioCreateDto("Quant Macro Fund", "Macro strategies", "USD", BigDecimal.valueOf(1000000));

        mockMvc.perform(post("/api/v1/portfolios")
                .header("Authorization", pmToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name", is("Quant Macro Fund")))
            .andExpect(jsonPath("$.currency", is("USD")))
            .andExpect(jsonPath("$.cashBalance", is(1000000)));
    }

    @Test
    @DisplayName("GET /api/v1/portfolios/{id} with invalid id returns 404 ProblemDetail")
    void testGetPortfolioNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/portfolios/port_non_existent")
                .header("Authorization", pmToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status", is(404)))
            .andExpect(jsonPath("$.title", is("Resource Not Found")))
            .andExpect(jsonPath("$.detail", containsString("Portfolio not found: port_non_existent")));
    }
}
