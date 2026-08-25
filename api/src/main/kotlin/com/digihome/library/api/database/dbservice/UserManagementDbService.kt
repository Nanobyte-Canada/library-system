package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.MembershipType
import com.digihome.library.api.database.enums.UserRole
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.format.DateTimeFormatter
import java.util.*

@Service
class UserManagementDbService(
    val userRepository: UserRepository,
    val loginRepository: LoginRepository,
    val branchRepository: BranchRepository,
    val passwordEncoder: BCryptPasswordEncoder
) {
    val logger = LoggerFactory.getLogger(this::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

    fun createUser(request: UserCreateRequest): ServiceResponseModel {
        userRepository.findByEmailId(request.emailId)?.let {
            throw Exception("User with email '${request.emailId}' already exists")
        }

        userRepository.findByPhoneNumber(request.phoneNumber)?.let {
            throw Exception("User with phone '${request.phoneNumber}' already exists")
        }

        if (request.membershipId.isNotEmpty()) {
            userRepository.findByMembershipId(request.membershipId)?.let {
                throw Exception("User with membership ID '${request.membershipId}' already exists")
            }
        }

        val branch = request.branchId?.let {
            branchRepository.findById(it).orElseThrow { Exception("Branch not found: $it") }
        }

        val user = UserEntity(
            id = UUID.randomUUID().toString(),
            membershipId = request.membershipId,
            firstName = request.firstName,
            lastName = request.lastName,
            phoneNumber = request.phoneNumber,
            emailId = request.emailId,
            role = request.role,
            membershipType = request.membershipType,
            branch = branch,
            isActive = true
        )
        userRepository.save(user)

        if (request.password.isNotEmpty()) {
            val login = LoginEntity(
                id = UUID.randomUUID().toString(),
                user = user,
                username = request.emailId,
                password = passwordEncoder.encode(request.password)
            )
            loginRepository.save(login)
        }

        return ServiceResponseModel(true, "User created successfully")
    }

    fun updateUser(userId: String, request: UserUpdateRequest): ServiceResponseModel {
        val user = userRepository.findById(userId)
            .orElseThrow { Exception("User not found: $userId") }

        request.firstName?.let { user.firstName = it }
        request.lastName?.let { user.lastName = it }
        request.phoneNumber?.let { user.phoneNumber = it }
        request.emailId?.let { user.emailId = it }
        request.role?.let { user.role = it }
        request.membershipType?.let { user.membershipType = it }
        request.branchId?.let { branchId ->
            val branch = branchRepository.findById(branchId)
                .orElseThrow { Exception("Branch not found: $branchId") }
            user.branch = branch
        }
        request.isActive?.let { user.isActive = it }
        user.updatedAt = java.time.LocalDateTime.now()

        userRepository.save(user)
        return ServiceResponseModel(true, "User updated successfully")
    }

    fun getUserById(userId: String): UserResponse? {
        val user = userRepository.findById(userId).orElse(null) ?: return null
        return mapToUserResponse(user)
    }

    fun listUsers(page: Int, size: Int): PagedResponse<UserResponse> {
        val pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        val pageResult = userRepository.findAll(pageable)

        return PagedResponse(
            success = true,
            data = pageResult.content.map { mapToUserResponse(it) },
            total = pageResult.totalElements,
            page = page,
            size = size,
            totalPages = pageResult.totalPages
        )
    }

    fun searchUsers(params: UserSearchParams): PagedResponse<UserResponse> {
        val pageable = PageRequest.of(params.page - 1, params.size, Sort.by(Sort.Direction.DESC, "createdAt"))

        val pageResult = userRepository.searchUsers(
            params.q,
            params.role,
            params.branchId,
            params.isActive,
            pageable
        )

        return PagedResponse(
            success = true,
            data = pageResult.content.map { mapToUserResponse(it) },
            total = pageResult.totalElements,
            page = params.page,
            size = params.size,
            totalPages = pageResult.totalPages
        )
    }

    fun changePassword(userId: String, request: PasswordChangeRequest): ServiceResponseModel {
        val user = userRepository.findById(userId)
            .orElseThrow { Exception("User not found: $userId") }

        val login = loginRepository.findByUsername(user.emailId)
            ?: throw Exception("Login account not found for user")

        if (!passwordEncoder.matches(request.currentPassword, login.password)) {
            throw Exception("Current password is incorrect")
        }

        if (request.newPassword.length < 6) {
            throw Exception("New password must be at least 6 characters")
        }

        login.password = passwordEncoder.encode(request.newPassword)
        login.updatedAt = java.time.LocalDateTime.now()
        loginRepository.save(login)

        return ServiceResponseModel(true, "Password changed successfully")
    }

    fun getProfile(userId: String): UserResponse? {
        return getUserById(userId)
    }

    fun updateProfile(userId: String, request: UserUpdateRequest): ServiceResponseModel {
        return updateUser(userId, request)
    }

    @Transactional
    fun register(request: RegisterRequest): UserEntity {
        require(request.firstName.isNotBlank()) { "First name is required" }
        require(request.lastName.isNotBlank()) { "Last name is required" }
        require(request.email.isNotBlank() && "@" in request.email) { "A valid email is required" }
        require(request.password.length >= 6) { "Password must be at least 6 characters" }

        userRepository.findByEmailId(request.email)?.let {
            throw Exception("Email is already registered")
        }
        loginRepository.findByUsername(request.email)?.let {
            throw Exception("Username is already taken")
        }
        if (request.membershipId.isNotBlank()) {
            userRepository.findByMembershipId(request.membershipId)?.let {
                throw Exception("Membership ID is already in use")
            }
        }

        val user = userRepository.save(
            UserEntity(
                firstName = request.firstName.trim(),
                lastName = request.lastName.trim(),
                phoneNumber = request.phoneNumber,
                emailId = request.email.trim().lowercase(),
                role = UserRole.MEMBER,
                membershipType = MembershipType.PUBLIC,
                isActive = true,
                createdBy = "self-registration"
            )
        )
        loginRepository.save(
            LoginEntity(
                user = user,
                username = request.email.trim().lowercase(),
                password = passwordEncoder.encode(request.password)
            )
        )
        return user
    }

    private fun mapToUserResponse(user: UserEntity): UserResponse {
        return UserResponse(
            id = user.id,
            membershipId = user.membershipId,
            firstName = user.firstName,
            lastName = user.lastName,
            phoneNumber = user.phoneNumber,
            emailId = user.emailId,
            role = user.role,
            membershipType = user.membershipType,
            branchId = user.branch?.id,
            branchName = user.branch?.name,
            isActive = user.isActive,
            createdAt = user.createdAt.format(dateFormatter),
            updatedAt = user.updatedAt.format(dateFormatter)
        )
    }
}
