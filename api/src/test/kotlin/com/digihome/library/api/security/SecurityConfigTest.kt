package com.digihome.library.api.security

import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.web.SecurityFilterChain

class SecurityConfigTest : AbstractIntegrationTest() {

    @Autowired lateinit var filterChain: SecurityFilterChain

    @Test
    fun `security filter chain bean builds without NPE`() {
        org.junit.jupiter.api.Assertions.assertNotNull(filterChain)
    }
}
