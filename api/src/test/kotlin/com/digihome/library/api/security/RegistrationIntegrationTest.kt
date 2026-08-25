package com.digihome.library.api.security

import com.digihome.library.api.database.entity.LoginRepository
import com.digihome.library.api.database.entity.UserRepository
import com.digihome.library.api.database.enums.UserRole
import com.digihome.library.api.models.LoginModel
import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType

class RegistrationIntegrationTest : AbstractIntegrationTest() {

    @Autowired lateinit var restTemplate: TestRestTemplate
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var loginRepository: LoginRepository

    private fun registerBody(email: String) = mapOf(
        "firstName" to "New", "lastName" to "Member", "email" to email,
        "password" to "secret1", "phoneNumber" to "+1-555-0000", "membershipId" to ""
    )

    @Test
    fun `register creates active member who can immediately log in`() {
        val email = "reg-${System.nanoTime()}@example.com"

        val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_JSON }
        val response = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/register",
            HttpEntity(registerBody(email), headers),
            String::class.java
        )
        assertEquals(HttpStatus.OK, response.statusCode)
        assertTrue(response.body!!.contains("\"role\":\"MEMBER\""))

        val saved = userRepository.findByEmailId(email)!!
        assertTrue(saved.isActive)
        assertEquals(UserRole.MEMBER, saved.role)
        assertEquals(email, loginRepository.findByUsername(email)!!.username)

        val login = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/login",
            HttpEntity(LoginModel(email, "secret1")),
            String::class.java
        )
        assertEquals(HttpStatus.OK, login.statusCode)
    }

    @Test
    fun `duplicate email registration is rejected`() {
        val email = "dup-${System.nanoTime()}@example.com"
        val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_JSON }
        restTemplate.postForEntity(
            "http://localhost:$port/api/auth/register", HttpEntity(registerBody(email), headers), String::class.java
        )
        val second = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/register", HttpEntity(registerBody(email), headers), String::class.java
        )
        assertEquals(HttpStatus.BAD_REQUEST, second.statusCode)
    }
}
