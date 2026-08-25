package com.digihome.library.api.security

import com.digihome.library.api.database.entity.LoginEntity
import com.digihome.library.api.database.entity.UserEntity
import com.digihome.library.api.database.entity.LoginRepository
import com.digihome.library.api.database.entity.UserRepository
import com.digihome.library.api.database.enums.UserRole
import com.digihome.library.api.models.LoginModel
import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType

class RoleEnforcementIntegrationTest : AbstractIntegrationTest() {

    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var loginRepository: LoginRepository
    @Autowired lateinit var passwordEncoder: org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
    @Autowired lateinit var restTemplate: TestRestTemplate

    private fun makeUser(suffix: String, role: UserRole): Pair<UserEntity, String> {
        val user = userRepository.save(
            UserEntity(firstName = "R", lastName = suffix, phoneNumber = "1$suffix",
                emailId = "$suffix@role.t", role = role)
        )
        loginRepository.save(
            LoginEntity(user = user, username = "role-$suffix", password = passwordEncoder.encode("password1"))
        )
        return user to "role-$suffix"
    }

    private fun bearer(username: String): HttpHeaders {
        val login = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/login",
            HttpEntity(LoginModel(username, "password1")),
            String::class.java
        )
        return HttpHeaders().apply {
            set(HttpHeaders.AUTHORIZATION, login.headers.getFirst(HttpHeaders.AUTHORIZATION))
        }
    }

    @Test
    fun `member cannot list all users - admin can`() {
        val (_, memberUsername) = makeUser("m${System.nanoTime()}", UserRole.MEMBER)
        val (_, adminUsername) = makeUser("a${System.nanoTime()}", UserRole.ADMIN)

        val memberResponse = restTemplate.exchange(
            "http://localhost:$port/api/users", org.springframework.http.HttpMethod.GET,
            HttpEntity<Void>(bearer(memberUsername)), String::class.java
        )
        assertEquals(HttpStatus.FORBIDDEN, memberResponse.statusCode)

        val adminResponse = restTemplate.exchange(
            "http://localhost:$port/api/users", org.springframework.http.HttpMethod.GET,
            HttpEntity<Void>(bearer(adminUsername)), String::class.java
        )
        assertEquals(HttpStatus.OK, adminResponse.statusCode)
    }

    @Test
    fun `member cannot create book - librarian can`() {
        val (_, memberUsername) = makeUser("mb${System.nanoTime()}", UserRole.MEMBER)
        val (_, libUsername) = makeUser("lb${System.nanoTime()}", UserRole.LIBRARIAN)
        val body = mapOf("bookName" to "T", "author" to "A")

        val headers = bearer(memberUsername); headers.contentType = MediaType.APPLICATION_JSON
        val memberResponse = restTemplate.postForEntity(
            "http://localhost:$port/api/books", HttpEntity(body, headers), String::class.java
        )
        assertEquals(HttpStatus.FORBIDDEN, memberResponse.statusCode)

        val libHeaders = bearer(libUsername); libHeaders.contentType = MediaType.APPLICATION_JSON
        val libResponse = restTemplate.postForEntity(
            "http://localhost:$port/api/books", HttpEntity(body, libHeaders), String::class.java
        )
        assertEquals(HttpStatus.OK, libResponse.statusCode)
    }
}
