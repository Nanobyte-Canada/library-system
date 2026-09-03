package com.digihome.library.api.security

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm.HMAC512
import com.digihome.library.api.configuration.JwtConfig
import com.digihome.library.api.models.LoginModel
import com.digihome.library.api.models.LoginResponseModel
import com.digihome.library.api.models.ResponseModel
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import java.io.IOException
import java.util.*

class JWTAuthenticationFilter(
    val authManager: AuthenticationManager,
    val jwtConfig: JwtConfig,
    val objectMapper: ObjectMapper
) : UsernamePasswordAuthenticationFilter() {

    init {
        // Intercept POST {jwt.url} (e.g. /api/auth/login) — the URL the frontend calls —
        // instead of the UsernamePasswordAuthenticationFilter default (/login).
        setFilterProcessesUrl(jwtConfig.url)
    }

    @Throws(AuthenticationException::class)
    override fun attemptAuthentication(req: HttpServletRequest, res: HttpServletResponse?): Authentication? {
        return try {
            val loginModel: LoginModel = ObjectMapper().readValue(req.inputStream, LoginModel::class.java)
            authManager.authenticate(
                UsernamePasswordAuthenticationToken(
                    loginModel.username,
                    loginModel.password,
                    ArrayList()
                )
            )
        } catch (e: IOException) {
            throw RuntimeException(e)
        }
    }

    @Throws(IOException::class)
    override fun successfulAuthentication(
        req: HttpServletRequest?,
        res: HttpServletResponse,
        chain: FilterChain?,
        auth: Authentication
    ) {
        val principal = auth.principal as LibraryUserPrincipal
        val loginResponseModel = LoginResponseModel(
            id = principal.id,
            firstName = principal.firstName,
            lastName = principal.lastName,
            role = principal.role,
            email = principal.email
        )
        val responseModel = ResponseModel(message = "Login successful", data = loginResponseModel)
        val responseModelJson = objectMapper.writeValueAsString(responseModel)

        val token: String = JWT.create()
            .withSubject(principal.id)
            .withClaim("username", principal.username)
            .withClaim("role", principal.role)
            .withExpiresAt(Date(System.currentTimeMillis() + jwtConfig.expiration))
            .sign(HMAC512(jwtConfig.secret))

        res.addHeader(jwtConfig.header, jwtConfig.prefix + token)
        res.contentType = "application/json"
        res.characterEncoding = "UTF-8"
        res.writer.write(responseModelJson)
        res.writer.flush()
        res.writer.close()
    }

    @Throws(IOException::class)
    override fun unsuccessfulAuthentication(
        req: HttpServletRequest?,
        res: HttpServletResponse,
        failed: AuthenticationException
    ) {
        // Return a JSON 401 directly instead of forwarding to /error, so failed
        // logins surface as meaningful responses for the frontend.
        val responseModel = ResponseModel(message = "Invalid username or password", data = null)
        res.status = HttpServletResponse.SC_UNAUTHORIZED
        res.contentType = "application/json"
        res.characterEncoding = "UTF-8"
        res.writer.write(objectMapper.writeValueAsString(responseModel))
        res.writer.flush()
        res.writer.close()
    }
}
