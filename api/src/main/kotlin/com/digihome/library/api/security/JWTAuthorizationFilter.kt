package com.digihome.library.api.security

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.digihome.library.api.configuration.JwtConfig
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter

class JWTAuthorizationFilter(
    authManager: AuthenticationManager,
    val jwtConfig: JwtConfig,
    val objectMapper: ObjectMapper
) : BasicAuthenticationFilter(authManager) {

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val header = request.getHeader(jwtConfig.header)
        if (header == null || !header.startsWith(jwtConfig.prefix)) {
            chain.doFilter(request, response)
            return
        }
        val authentication = getAuthentication(request)
        if (authentication != null) {
            SecurityContextHolder.getContext().authentication = authentication
        }
        chain.doFilter(request, response)
    }

    private fun getAuthentication(request: HttpServletRequest): UsernamePasswordAuthenticationToken? {
        val token = request.getHeader(jwtConfig.header) ?: return null
        val tokenValue = token.removePrefix(jwtConfig.prefix).trim()

        return try {
            val decoded = JWT.require(Algorithm.HMAC512(jwtConfig.secret))
                .build()
                .verify(tokenValue)

            val userId = decoded.subject
            val username = decoded.getClaim("username").asString()
            val role = decoded.getClaim("role").asString()

            val authorities = listOf(SimpleGrantedAuthority("ROLE_$role"))
            UsernamePasswordAuthenticationToken(userId, null, authorities)
        } catch (e: Exception) {
            null
        }
    }
}
