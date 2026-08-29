package com.digihome.library.api.security

import com.digihome.library.api.configuration.JwtConfig
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.core.annotation.Order
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(
    val libraryUserDetailService: LibraryUserDetailService,
    val jwtConfig: JwtConfig,
    val objectMapper: ObjectMapper
) {

    val logger = LoggerFactory.getLogger(this::class.java)

    @Bean
    fun passwordEncoder(): BCryptPasswordEncoder = BCryptPasswordEncoder(9)

    @Bean
    fun authenticationManager(authConfig: AuthenticationConfiguration): AuthenticationManager =
        authConfig.authenticationManager

    @Bean
    @Order(1)
    fun actuatorFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .securityMatcher("/actuator/**")
            .authorizeHttpRequests { auth ->
                auth.anyRequest().permitAll()
            }
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        return http.build()
    }

    @Bean
    @Order(2)
    fun filterChain(http: HttpSecurity, authenticationManager: AuthenticationManager): SecurityFilterChain {
        http
            .cors { }
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(HttpMethod.POST, jwtConfig.url).permitAll()
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    // Sprint 2: Allow public catalog browsing
                    .requestMatchers(HttpMethod.GET, "/api/books").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/{id}").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/search").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/{id}/copies").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/{id}/qr").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/categories").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/categories/{id}").permitAll()
                    .anyRequest().authenticated()
            }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .addFilter(
                JWTAuthenticationFilter(authenticationManager, jwtConfig, objectMapper)
            )
            .addFilter(
                JWTAuthorizationFilter(authenticationManager, jwtConfig, objectMapper)
            )

        return http.build()
    }
}
