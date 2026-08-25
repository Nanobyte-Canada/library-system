package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.UserManagementDbService
import com.digihome.library.api.models.RegisterRequest
import com.digihome.library.api.models.ResponseModel
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class AuthController(
    val userManagementDbService: UserManagementDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping("/api/auth/register")
    fun register(@RequestBody request: RegisterRequest): ResponseEntity<ResponseModel> {
        logger.info("Registration attempt: email=${request.email}")
        return try {
            val user = userManagementDbService.register(request)
            ResponseEntity(
                ResponseModel(
                    true, "Registration successful", HttpStatus.OK.value(),
                    mapOf(
                        "id" to user.id, "firstName" to user.firstName, "lastName" to user.lastName,
                        "role" to user.role.name, "email" to user.emailId
                    )
                ),
                HttpStatus.OK
            )
        } catch (e: Exception) {
            logger.error("Registration failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
}
