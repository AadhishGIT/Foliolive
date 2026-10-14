package com.foliolive.core.dto;

import jakarta.validation.constraints.NotBlank;

public class AuthDto {
    public record LoginRequest(
        @NotBlank(message = "Username is required")
        String username,

        @NotBlank(message = "Password is required")
        String password
    ) {}

    public record AuthResponse(
        String token,
        long expiresIn,
        String userId,
        String username,
        String fullName,
        String role
    ) {}
}
