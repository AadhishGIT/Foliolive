package com.foliolive.core.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class CorrelationIdFilterTest {

    private CorrelationIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdFilter();
        MDC.clear();
    }

    @Test
    @DisplayName("Should propagate existing X-Correlation-ID header to MDC and response")
    void shouldPropagateExistingCorrelationId() throws ServletException, IOException {
        String existingId = "test-corr-id-12345";
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, existingId);
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<String> mdcCaptured = new AtomicReference<>();
        FilterChain chain = (req, res) -> {
            mdcCaptured.set(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY));
        };

        filter.doFilterInternal(request, response, chain);

        assertThat(mdcCaptured.get()).isEqualTo(existingId);
        assertThat(response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER)).isEqualTo(existingId);
        assertThat(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY)).isNull();
    }

    @Test
    @DisplayName("Should generate UUID correlation ID when header is missing")
    void shouldGenerateCorrelationIdWhenMissing() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<String> mdcCaptured = new AtomicReference<>();
        FilterChain chain = (req, res) -> {
            mdcCaptured.set(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY));
        };

        filter.doFilterInternal(request, response, chain);

        String captured = mdcCaptured.get();
        assertThat(captured).isNotNull().isNotBlank();
        // Validate valid UUID
        assertThat(UUID.fromString(captured)).isNotNull();
        assertThat(response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER)).isEqualTo(captured);
        assertThat(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY)).isNull();
    }

    @Test
    @DisplayName("Should generate UUID correlation ID when header is blank whitespace")
    void shouldGenerateCorrelationIdWhenBlank() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, "   ");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<String> mdcCaptured = new AtomicReference<>();
        FilterChain chain = (req, res) -> {
            mdcCaptured.set(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY));
        };

        filter.doFilterInternal(request, response, chain);

        String captured = mdcCaptured.get();
        assertThat(captured).isNotNull().isNotBlank();
        assertThat(UUID.fromString(captured)).isNotNull();
        assertThat(response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER)).isEqualTo(captured);
        assertThat(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY)).isNull();
    }
}
