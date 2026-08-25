package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.UserManagementDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
class UserManagementController(
    val userManagementDbService: UserManagementDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun createUser(@RequestBody request: UserCreateRequest): ResponseEntity<ResponseModel> {
        logger.info("Create user request: ${request.emailId}")
        return try {
            val response = userManagementDbService.createUser(request)
            ResponseEntity(response, HttpStatus.CREATED)
        } catch (e: Exception) {
            logger.error("Create user failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateUser(@PathVariable id: String, @RequestBody request: UserUpdateRequest): ResponseEntity<ResponseModel> {
        logger.info("Update user request: $id")
        return try {
            val response = userManagementDbService.updateUser(id, request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Update user failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getUser(@PathVariable id: String): ResponseEntity<ResponseModel> {
        logger.info("Get user: $id")
        return try {
            val user = userManagementDbService.getUserById(id)
            if (user != null) {
                ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), user), HttpStatus.OK)
            } else {
                ResponseEntity(
                    ResponseModel(success = false, message = "User not found", code = HttpStatus.NOT_FOUND.value()),
                    HttpStatus.NOT_FOUND
                )
            }
        } catch (e: Exception) {
            logger.error("Get user failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun listUsers(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<PagedResponse<UserResponse>> {
        logger.info("List users: page=$page, size=$size")
        return try {
            val response = userManagementDbService.listUsers(page, size)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("List users failed: ${e.message}")
            ResponseEntity(
                PagedResponse(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    fun searchUsers(
        @RequestParam(required = false) q: String?,
        @RequestParam(required = false) role: String?,
        @RequestParam(required = false) branchId: String?,
        @RequestParam(required = false) isActive: Boolean?,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<PagedResponse<UserResponse>> {
        logger.info("Search users: q=$q, role=$role")
        return try {
            val userRole = role?.let { com.digihome.library.api.database.enums.UserRole.valueOf(it) }
            val params = UserSearchParams(q, userRole, branchId, isActive, page, size)
            val response = userManagementDbService.searchUsers(params)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Search users failed: ${e.message}")
            ResponseEntity(
                PagedResponse(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/me")
    fun getProfile(@AuthenticationPrincipal userId: String): ResponseEntity<ResponseModel> {
        logger.info("Get profile: $userId")
        return try {
            val user = userManagementDbService.getProfile(userId)
            if (user != null) {
                ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), user), HttpStatus.OK)
            } else {
                ResponseEntity(
                    ResponseModel(success = false, message = "Profile not found", code = HttpStatus.NOT_FOUND.value()),
                    HttpStatus.NOT_FOUND
                )
            }
        } catch (e: Exception) {
            logger.error("Get profile failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @PutMapping("/me")
    fun updateProfile(
        @AuthenticationPrincipal userId: String,
        @RequestBody request: UserUpdateRequest
    ): ResponseEntity<ResponseModel> {
        logger.info("Update profile: $userId")
        return try {
            val response = userManagementDbService.updateProfile(userId, request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Update profile failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PutMapping("/me/password")
    fun changePassword(
        @AuthenticationPrincipal userId: String,
        @RequestBody request: PasswordChangeRequest
    ): ResponseEntity<ResponseModel> {
        logger.info("Change password: $userId")
        return try {
            val response = userManagementDbService.changePassword(userId, request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Change password failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
}
