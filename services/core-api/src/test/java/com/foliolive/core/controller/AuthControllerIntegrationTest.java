package com.foliolive.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foliolive.core.dto.AuthDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/v1/auth/login returns JWT token for valid PM credentials")
    void testLoginSuccessPM() throws Exception {
        AuthDto.LoginRequest request = new AuthDto.LoginRequest("pm_demo", "Password123!");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andExpect(jsonPath("$.username", is("pm_demo")))
            .andExpect(jsonPath("$.role", is("ROLE_PM")))
            .andExpect(jsonPath("$.expiresIn", is(86400)));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns JWT token for valid VIEWER credentials")
    void testLoginSuccessViewer() throws Exception {
        AuthDto.LoginRequest request = new AuthDto.LoginRequest("viewer_demo", "Password123!");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andExpect(jsonPath("$.username", is("viewer_demo")))
            .andExpect(jsonPath("$.role", is("ROLE_VIEWER")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns 401 RFC 7807 ProblemDetail on wrong password")
    void testLoginWrongPassword() throws Exception {
        AuthDto.LoginRequest request = new AuthDto.LoginRequest("pm_demo", "WrongPassword!");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.title", is("Unauthorized")))
            .andExpect(jsonPath("$.status", is(401)))
            .andExpect(jsonPath("$.detail", is("Invalid username or password")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns 401 RFC 7807 ProblemDetail on unknown user")
    void testLoginUnknownUser() throws Exception {
        AuthDto.LoginRequest request = new AuthDto.LoginRequest("unknown_user", "Password123!");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status", is(401)));
    }
}
