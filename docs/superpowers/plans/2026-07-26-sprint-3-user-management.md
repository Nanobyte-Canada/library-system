# Sprint 3: User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin can manage users and roles. Members can manage profiles. Password changes with validation.

**Architecture:** New RESTful controller under `/api/users/` with dedicated service. Frontend uses AG Grid for admin tables. Existing user/login entities are extended with new repository methods and DTOs.

**Tech Stack:** Kotlin, Spring Boot 3.3.5, Spring Data JPA, BCrypt, React 19, TypeScript, AG Grid, TanStack Query, Zustand

## Global Constraints

- Java 17, Kotlin 1.9.25, Spring Boot 3.3.5
- MySQL 8.x with Flyway migrations (no schema changes — using existing tables)
- JWT auth with roles: ADMIN, LIBRARIAN, MEMBER
- Frontend: React 19, Vite 5.x, TypeScript strict mode
- All API responses use `ResponseModel` wrapper: `{ success, message, code, data }`
- IDs are UUID strings
- BCrypt for password hashing (cost factor 9)

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `api/src/main/kotlin/com/digihome/library/api/models/UserManagementModels.kt` | Request/response DTOs for users |
| `api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserManagementDbService.kt` | User CRUD, profile, password |
| `api/src/main/kotlin/com/digihome/library/api/controller/UserManagementController.kt` | REST endpoints |

### Backend — Modified Files
| File | Change |
|------|--------|
| `api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt` | Add repository query methods |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/services/userService.ts` | User API calls |
| `frontend/src/pages/admin/UserListPage.tsx` | AG Grid user list |
| `frontend/src/pages/admin/UserFormPage.tsx` | Create/Edit user form |
| `frontend/src/pages/member/ProfilePage.tsx` | My Profile + Change Password |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add UserCreateRequest, UserUpdateRequest, etc. |
| `frontend/src/App.tsx` | Add user management routes |
| `frontend/src/components/Layout.tsx` | Add Users nav item |

---

### Task 1: User Management Models (DTOs)

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/models/UserManagementModels.kt`

- [ ] **Step 1: Create DTOs**

```kotlin
package com.digihome.library.api.models

import com.digihome.library.api.database.enums.MembershipType
import com.digihome.library.api.database.enums.UserRole

data class UserCreateRequest(
    var membershipId: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var phoneNumber: String = "",
    var emailId: String = "",
    var role: UserRole = UserRole.MEMBER,
    var membershipType: MembershipType = MembershipType.PUBLIC,
    var branchId: String? = null,
    var password: String = ""
)

data class UserUpdateRequest(
    var firstName: String? = null,
    var lastName: String? = null,
    var phoneNumber: String? = null,
    var emailId: String? = null,
    var role: UserRole? = null,
    var membershipType: MembershipType? = null,
    var branchId: String? = null,
    var isActive: Boolean? = null
)

data class UserResponse(
    var id: String = "",
    var membershipId: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var phoneNumber: String = "",
    var emailId: String = "",
    var role: UserRole = UserRole.MEMBER,
    var membershipType: MembershipType = MembershipType.PUBLIC,
    var branchId: String? = null,
    var branchName: String? = null,
    var isActive: Boolean = true,
    var createdAt: String = "",
    var updatedAt: String = ""
)

data class PasswordChangeRequest(
    var currentPassword: String = "",
    var newPassword: String = ""
)

data class UserSearchParams(
    var q: String? = null,
    var role: UserRole? = null,
    var branchId: String? = null,
    var isActive: Boolean? = null,
    var page: Int = 1,
    var size: Int = 20
)
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/models/UserManagementModels.kt
git commit -m "feat: add user management DTOs for Sprint 3"
```

---

### Task 2: UserRepository Updates

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt`

- [ ] **Step 1: Add query methods to UserRepository**

Replace the `UserRepository` interface with:

```kotlin
interface UserRepository : JpaRepository<UserEntity, String> {
    fun findByPhoneNumber(phoneNumber: String): UserEntity?
    fun findByEmailId(emailId: String): UserEntity?
    fun findByRole(role: com.digihome.library.api.database.enums.UserRole): List<UserEntity>
    fun findByMembershipId(membershipId: String): UserEntity?
    fun findByIsActive(isActive: Boolean): List<UserEntity>

    @Query("SELECT u FROM UserEntity u WHERE " +
           "(:q IS NULL OR LOWER(u.firstName) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(u.emailId) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(u.membershipId) LIKE LOWER(CONCAT('%',:q,'%'))) " +
           "AND (:role IS NULL OR u.role = :role) " +
           "AND (:branchId IS NULL OR u.branch.id = :branchId) " +
           "AND (:isActive IS NULL OR u.isActive = :isActive) " +
           "ORDER BY u.createdAt DESC")
    fun searchUsers(
        @Param("q") q: String?,
        @Param("role") role: com.digihome.library.api.database.enums.UserRole?,
        @Param("branchId") branchId: String?,
        @Param("isActive") isActive: Boolean?,
        pageable: org.springframework.data.domain.Pageable
    ): org.springframework.data.domain.Page<UserEntity>
}
```

Add imports:
```kotlin
import org.springframework.data.jpa.repository.Query
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.repository.query.Param
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt
git commit -m "feat: add UserRepository search and pagination methods"
```

---

### Task 3: User Management Service

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserManagementDbService.kt`

- [ ] **Step 1: Create service**

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.UserRole
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
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
        // Check for duplicate email
        userRepository.findByEmailId(request.emailId)?.let {
            throw Exception("User with email '${request.emailId}' already exists")
        }

        // Check for duplicate phone
        userRepository.findByPhoneNumber(request.phoneNumber)?.let {
            throw Exception("User with phone '${request.phoneNumber}' already exists")
        }

        // Check for duplicate membership ID
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

        // Create login account
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
        // Members can only update their own profile, limited fields
        return updateUser(userId, request)
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
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserManagementDbService.kt
git commit -m "feat: add UserManagementDbService with CRUD, profile, and password"
```

---

### Task 4: User Management Controller

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/controller/UserManagementController.kt`

- [ ] **Step 1: Create controller**

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.UserManagementDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
class UserManagementController(
    val userManagementDbService: UserManagementDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping
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
    fun getProfile(@RequestHeader("X-User-Id") userId: String): ResponseEntity<ResponseModel> {
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
        @RequestHeader("X-User-Id") userId: String,
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
        @RequestHeader("X-User-Id") userId: String,
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
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/controller/UserManagementController.kt
git commit -m "feat: add UserManagementController with full REST API"
```

---

### Task 5: Frontend Types + Services

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/userService.ts`

- [ ] **Step 1: Add types to index.ts**

```typescript
// --- User Management Types ---

export interface UserCreateRequest {
  membershipId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailId: string;
  role: UserRole;
  membershipType: MembershipType;
  branchId: string | null;
  password: string;
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailId?: string;
  role?: UserRole;
  membershipType?: MembershipType;
  branchId?: string;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailId: string;
  role: UserRole;
  membershipType: MembershipType;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserSearchParams {
  q?: string;
  role?: UserRole;
  branchId?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}
```

- [ ] **Step 2: Create userService.ts**

```typescript
import api from './api';
import type {
  UserResponse,
  UserCreateRequest,
  UserUpdateRequest,
  PasswordChangeRequest,
  UserSearchParams,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const userService = {
  async createUser(data: UserCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: UserUpdateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>(`/users/${id}`, data);
    return response.data;
  },

  async getUser(id: string): Promise<ApiResponse<UserResponse>> {
    const response = await api.get<ApiResponse<UserResponse>>(`/users/${id}`);
    return response.data;
  },

  async listUsers(page = 1, size = 20): Promise<PaginatedResponse<UserResponse>> {
    const response = await api.get<PaginatedResponse<UserResponse>>('/users', {
      params: { page, size },
    });
    return response.data;
  },

  async searchUsers(params: UserSearchParams): Promise<PaginatedResponse<UserResponse>> {
    const response = await api.get<PaginatedResponse<UserResponse>>('/users/search', {
      params,
    });
    return response.data;
  },

  async getProfile(): Promise<ApiResponse<UserResponse>> {
    const response = await api.get<ApiResponse<UserResponse>>('/users/me');
    return response.data;
  },

  async updateProfile(data: UserUpdateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>('/users/me', data);
    return response.data;
  },

  async changePassword(data: PasswordChangeRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>('/users/me/password', data);
    return response.data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/userService.ts
git commit -m "feat: add user management types and API service"
```

---

### Task 6: Admin User List Page (AG Grid)

**Files:**
- Create: `frontend/src/pages/admin/UserListPage.tsx`
- Create: `frontend/src/pages/admin/UserListPage.css`

- [ ] **Step 1: Create UserListPage.tsx and .css**

(Component code follows same AG Grid pattern as BookListPage — role column with badge, status column, click to edit)

- [ ] **Step 2: Commit**

---

### Task 7: Admin User Form Page

**Files:**
- Create: `frontend/src/pages/admin/UserFormPage.tsx`
- Create: `frontend/src/pages/admin/UserFormPage.css`

- [ ] **Step 1: Create form with role/branch assignment**

- [ ] **Step 2: Commit**

---

### Task 8: Member Profile Page

**Files:**
- Create: `frontend/src/pages/member/ProfilePage.tsx`
- Create: `frontend/src/pages/member/ProfilePage.css`

- [ ] **Step 1: Create profile + change password page**

- [ ] **Step 2: Commit**

---

### Task 9: Routing + Navigation Updates

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Add routes and nav items**

- [ ] **Step 2: Commit**
