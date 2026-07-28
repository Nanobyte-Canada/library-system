# Sprint 5: Reservations + Branch Management + Audit Logging

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Book reservation/hold system, branch CRUD, audit logging. Entity layer exists — building service + controller + frontend.

**Entities already exist:** BookReservationEntity, BranchEntity, AuditLogEntity, EmailLogEntity

## Global Constraints

- Java 17, Kotlin 1.9.25, Spring Boot 3.3.5, Gradle 8.10.2 (Kotlin DSL)
- MySQL 8.x (no schema changes — using existing tables)
- JWT auth with roles: ADMIN, LIBRARIAN, MEMBER
- Frontend: React 19, Vite 5.x, TypeScript
- All API responses use `ResponseModel` wrapper

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `api/src/main/kotlin/com/digihome/library/api/models/ReservationModels.kt` | Request/response DTOs |
| `api/src/main/kotlin/com/digihome/library/api/database/dbservice/ReservationDbService.kt` | Reservation logic |
| `api/src/main/kotlin/com/digihome/library/api/controller/ReservationController.kt` | REST endpoints |
| `api/src/main/kotlin/com/digihome/library/api/database/dbservice/BranchDbService.kt` | Branch CRUD logic |
| `api/src/main/kotlin/com/digihome/library/api/controller/BranchController.kt` | Branch endpoints |
| `api/src/main/kotlin/com/digihome/library/api/database/dbservice/AuditLogDbService.kt` | Audit logging logic |
| `api/src/main/kotlin/com/digihome/library/api/controller/AuditLogController.kt` | Audit log endpoints |

### Backend — Modified Files
| File | Change |
|------|--------|
| `api/src/main/kotlin/com/digihome/library/api/database/entity/BookReservationEntity.kt` | Add repository query methods |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/services/reservationService.ts` | Reservation API calls |
| `frontend/src/services/branchService.ts` | Branch API calls |
| `frontend/src/pages/member/ReservationsPage.tsx` | Member's reservations list |
| `frontend/src/pages/admin/BranchListPage.tsx` | Branch management |
| `frontend/src/pages/admin/BranchFormPage.tsx` | Branch create/edit |
| `frontend/src/pages/admin/AuditLogPage.tsx` | Admin audit log viewer |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add reservation, branch, audit log types |
| `frontend/src/App.tsx` | Add routes |
| `frontend/src/components/Layout.tsx` | Add nav items |
| `frontend/src/pages/member/BookDetailPage.tsx` | Add "Reserve" button |

---

### Task 1: Reservation Models + Repository Updates

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/models/ReservationModels.kt`**

```kotlin
package com.digihome.library.api.models

data class ReserveBookRequest(
    var bookId: String = "",
    var branchId: String = ""
)

data class CancelReservationRequest(
    var reservationId: String = ""
)
```

- [ ] **Step 2: Add methods to BookReservationRepository in `BookReservationEntity.kt`**

```kotlin
    @Query("SELECT br FROM BookReservationEntity br WHERE br.user.id = :userId AND br.status IN :statuses ORDER BY br.reservedAt DESC")
    fun findByUserIdAndStatusIn(@Param("userId") userId: String, @Param("statuses") statuses: List<ReservationStatus>): List<BookReservationEntity>

    @Query("SELECT br FROM BookReservationEntity br WHERE br.book.id = :bookId AND br.status = :status ORDER BY br.queuePosition ASC")
    fun findByBookIdAndStatus(@Param("bookId") bookId: String, @Param("status") status: ReservationStatus): List<BookReservationEntity>

    @Query("SELECT COUNT(br) FROM BookReservationEntity br WHERE br.book.id = :bookId AND br.status = 'PENDING'")
    fun countPendingByBookId(@Param("bookId") bookId: String): Long
```

- [ ] **Step 3: Commit**

---

### Task 2: ReservationDbService

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/database/dbservice/ReservationDbService.kt`**

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.CopyStatus
import com.digihome.library.api.database.enums.ReservationStatus
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class ReservationDbService(
    val bookReservationRepository: BookReservationRepository,
    val booksRepository: BooksRepository,
    val bookCopyRepository: BookCopyRepository,
    val userRepository: UserRepository,
    val branchRepository: BranchRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    fun reserveBook(userId: String, request: ReserveBookRequest): ServiceResponseModel {
        val user = userRepository.findById(userId)
            .orElseThrow { Exception("User not found: $userId") }

        val book = booksRepository.findById(request.bookId)
            .orElseThrow { Exception("Book not found: ${request.bookId}") }

        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { Exception("Branch not found: ${request.branchId}") }

        // Check if user already has a pending reservation for this book
        val existingReservations = bookReservationRepository.findByUserIdAndStatusIn(
            userId, listOf(ReservationStatus.PENDING, ReservationStatus.READY)
        )
        if (existingReservations.any { it.book?.id == request.bookId }) {
            throw Exception("You already have a pending reservation for this book")
        }

        // Check if copies are available — if so, no need for reservation
        val availableCopies = bookCopyRepository.findAvailableCopiesByBookId(request.bookId)
        if (availableCopies.isNotEmpty()) {
            throw Exception("Copies are available — use checkout instead of reservation")
        }

        // Get next queue position
        val currentCount = bookReservationRepository.countPendingByBookId(request.bookId)
        val nextPosition = (currentCount + 1).toInt()

        val reservation = BookReservationEntity(
            id = java.util.UUID.randomUUID().toString(),
            user = user,
            book = book,
            branch = branch,
            status = ReservationStatus.PENDING,
            queuePosition = nextPosition,
            expiresAt = LocalDateTime.now().plusDays(7)
        )
        bookReservationRepository.save(reservation)

        return ServiceResponseModel(true, "Book reserved. Queue position: $nextPosition")
    }

    fun cancelReservation(userId: String, request: CancelReservationRequest): ServiceResponseModel {
        val reservation = bookReservationRepository.findById(request.reservationId)
            .orElseThrow { Exception("Reservation not found: ${request.reservationId}") }

        if (reservation.user?.id != userId) {
            throw Exception("You can only cancel your own reservations")
        }

        if (reservation.status != ReservationStatus.PENDING && reservation.status != ReservationStatus.READY) {
            throw Exception("Cannot cancel reservation in status: ${reservation.status}")
        }

        reservation.status = ReservationStatus.CANCELLED
        reservation.updatedAt = LocalDateTime.now()
        bookReservationRepository.save(reservation)

        // Recalculate queue positions for remaining pending reservations
        recalculateQueuePositions(reservation.book?.id ?: "")

        return ServiceResponseModel(true, "Reservation cancelled")
    }

    fun getMyReservations(userId: String): List<Map<String, Any?>> {
        val reservations = bookReservationRepository.findByUserIdAndStatusIn(
            userId, listOf(ReservationStatus.PENDING, ReservationStatus.READY, ReservationStatus.FULFILLED)
        )
        return reservations.map { mapToReservationResponse(it) }
    }

    fun getAllReservations(): List<Map<String, Any?>> {
        val reservations = bookReservationRepository.findByStatusOrderByReservedAtDesc(ReservationStatus.PENDING)
        val readyReservations = bookReservationRepository.findByStatusOrderByReservedAtDesc(ReservationStatus.READY)
        return (reservations + readyReservations).map { mapToReservationResponse(it) }
    }

    fun fulfillReservation(reservationId: String): ServiceResponseModel {
        val reservation = bookReservationRepository.findById(reservationId)
            .orElseThrow { Exception("Reservation not found: $reservationId") }

        if (reservation.status != ReservationStatus.READY) {
            throw Exception("Reservation is not ready for pickup")
        }

        reservation.status = ReservationStatus.FULFILLED
        reservation.updatedAt = LocalDateTime.now()
        bookReservationRepository.save(reservation)

        return ServiceResponseModel(true, "Reservation fulfilled")
    }

    fun markReady(reservationId: String): ServiceResponseModel {
        val reservation = bookReservationRepository.findById(reservationId)
            .orElseThrow { Exception("Reservation not found: $reservationId") }

        if (reservation.status != ReservationStatus.PENDING) {
            throw Exception("Reservation is not in PENDING status")
        }

        reservation.status = ReservationStatus.READY
        reservation.notifiedAt = LocalDateTime.now()
        reservation.expiresAt = LocalDateTime.now().plusDays(3)
        reservation.updatedAt = LocalDateTime.now()
        bookReservationRepository.save(reservation)

        return ServiceResponseModel(true, "Reservation marked as ready for pickup")
    }

    private fun recalculateQueuePositions(bookId: String) {
        val pendingReservations = bookReservationRepository.findByBookIdAndStatus(
            bookId, ReservationStatus.PENDING
        )
        pendingReservations.forEachIndexed { index, reservation ->
            reservation.queuePosition = index + 1
            bookReservationRepository.save(reservation)
        }
    }

    private fun mapToReservationResponse(reservation: BookReservationEntity): Map<String, Any?> {
        return mapOf(
            "id" to reservation.id,
            "userId" to (reservation.user?.id ?: ""),
            "userName" to ("${reservation.user?.firstName ?: ""} ${reservation.user?.lastName ?: ""}".trim()),
            "bookId" to (reservation.book?.id ?: ""),
            "bookName" to (reservation.book?.bookName ?: ""),
            "branchId" to (reservation.branch?.id ?: ""),
            "branchName" to (reservation.branch?.name ?: ""),
            "status" to reservation.status.name,
            "queuePosition" to reservation.queuePosition,
            "reservedAt" to reservation.reservedAt.toString(),
            "notifiedAt" to reservation.notifiedAt?.toString(),
            "expiresAt" to reservation.expiresAt?.toString()
        )
    }
}
```

- [ ] **Step 2: Add missing repository method to BookReservationRepository**

Add to `BookReservationEntity.kt`:
```kotlin
    fun findByStatusOrderByReservedAtDesc(status: ReservationStatus): List<BookReservationEntity>
```

- [ ] **Step 3: Commit**

---

### Task 3: ReservationController

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/controller/ReservationController.kt`**

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.ReservationDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
class ReservationController(
    val reservationDbService: ReservationDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping("/api/reservations")
    fun reserveBook(
        @RequestHeader("X-User-Id") userId: String,
        @RequestBody request: ReserveBookRequest
    ): ResponseEntity<ResponseModel> {
        logger.info("Reserve book: user=$userId, book=${request.bookId}")
        return try {
            val serviceResponse = reservationDbService.reserveBook(userId, request)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Reserve failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/reservations/{id}/cancel")
    fun cancelReservation(
        @RequestHeader("X-User-Id") userId: String,
        @PathVariable id: String
    ): ResponseEntity<ResponseModel> {
        logger.info("Cancel reservation: user=$userId, reservation=$id")
        return try {
            val serviceResponse = reservationDbService.cancelReservation(userId, CancelReservationRequest(id))
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Cancel failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping("/api/reservations/my")
    fun myReservations(@RequestHeader("X-User-Id") userId: String): ResponseEntity<ResponseModel> {
        return try {
            val reservations = reservationDbService.getMyReservations(userId)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), reservations), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/api/reservations")
    fun allReservations(): ResponseEntity<ResponseModel> {
        return try {
            val reservations = reservationDbService.getAllReservations()
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), reservations), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @PostMapping("/api/reservations/{id}/ready")
    fun markReady(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val serviceResponse = reservationDbService.markReady(id)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/reservations/{id}/fulfill")
    fun fulfillReservation(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val serviceResponse = reservationDbService.fulfillReservation(id)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
}
```

- [ ] **Step 2: Commit**

---

### Task 4: BranchDbService + BranchController

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/database/dbservice/BranchDbService.kt`**

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class BranchDbService(
    val branchRepository: BranchRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    fun getAllBranches(): List<Map<String, Any?>> {
        return branchRepository.findAll().map { mapToBranchResponse(it) }
    }

    fun getBranchById(id: String): Map<String, Any?> {
        val branch = branchRepository.findById(id)
            .orElseThrow { Exception("Branch not found: $id") }
        return mapToBranchResponse(branch)
    }

    fun createBranch(request: BranchCreateRequest): ServiceResponseModel {
        if (branchRepository.findByName(request.name) != null) {
            throw Exception("Branch with name '${request.name}' already exists")
        }
        val branch = BranchEntity(
            id = java.util.UUID.randomUUID().toString(),
            name = request.name,
            address = request.address,
            phone = request.phone,
            email = request.email
        )
        branchRepository.save(branch)
        return ServiceResponseModel(true, "Branch created")
    }

    fun updateBranch(id: String, request: BranchCreateRequest): ServiceResponseModel {
        val branch = branchRepository.findById(id)
            .orElseThrow { Exception("Branch not found: $id") }
        branch.name = request.name
        branch.address = request.address
        branch.phone = request.phone
        branch.email = request.email
        branchRepository.save(branch)
        return ServiceResponseModel(true, "Branch updated")
    }

    fun deleteBranch(id: String): ServiceResponseModel {
        val branch = branchRepository.findById(id)
            .orElseThrow { Exception("Branch not found: $id") }
        branchRepository.delete(branch)
        return ServiceResponseModel(true, "Branch deleted")
    }

    private fun mapToBranchResponse(branch: BranchEntity): Map<String, Any?> {
        return mapOf(
            "id" to branch.id,
            "name" to branch.name,
            "address" to branch.address,
            "phone" to branch.phone,
            "email" to branch.email,
            "createdAt" to branch.createdAt.toString()
        )
    }
}
```

- [ ] **Step 2: Create `api/src/main/kotlin/com/digihome/library/api/models/BranchModels.kt`**

```kotlin
package com.digihome.library.api.models

data class BranchCreateRequest(
    var name: String = "",
    var address: String = "",
    var phone: String = "",
    var email: String = ""
)
```

- [ ] **Step 3: Create `api/src/main/kotlin/com/digihome/library/api/controller/BranchController.kt`**

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.BranchDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
class BranchController(
    val branchDbService: BranchDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @GetMapping("/api/branches")
    fun getAllBranches(): ResponseEntity<ResponseModel> {
        return try {
            val branches = branchDbService.getAllBranches()
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), branches), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/api/branches/{id}")
    fun getBranchById(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val branch = branchDbService.getBranchById(id)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), branch), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.NOT_FOUND.value()),
                HttpStatus.NOT_FOUND
            )
        }
    }

    @PostMapping("/api/branches")
    fun createBranch(@RequestBody request: BranchCreateRequest): ResponseEntity<ResponseModel> {
        return try {
            val serviceResponse = branchDbService.createBranch(request)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.CREATED.value()), HttpStatus.CREATED)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PutMapping("/api/branches/{id}")
    fun updateBranch(@PathVariable id: String, @RequestBody request: BranchCreateRequest): ResponseEntity<ResponseModel> {
        return try {
            val serviceResponse = branchDbService.updateBranch(id, request)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @DeleteMapping("/api/branches/{id}")
    fun deleteBranch(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val serviceResponse = branchDbService.deleteBranch(id)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
}
```

- [ ] **Step 4: Commit**

---

### Task 5: AuditLogDbService + AuditLogController

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/database/dbservice/AuditLogDbService.kt`**

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.models.ServiceResponseModel
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class AuditLogDbService(
    val auditLogRepository: AuditLogRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    fun logAction(userId: String?, action: String, entityType: String, entityId: String, details: String? = null) {
        val log = AuditLogEntity(
            id = java.util.UUID.randomUUID().toString(),
            user = userId?.let { userRepository.findById(it).orElse(null) },
            action = action,
            entityType = entityType,
            entityId = entityId,
            details = details
        )
        auditLogRepository.save(log)
    }

    fun getAuditLogs(entityType: String? = null, limit: Int = 100): List<Map<String, Any?>> {
        val logs = if (entityType != null) {
            auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType)
        } else {
            auditLogRepository.findAllByOrderByCreatedAtDesc()
        }
        return logs.take(limit).map { mapToAuditLogResponse(it) }
    }

    private fun mapToAuditLogResponse(log: AuditLogEntity): Map<String, Any?> {
        return mapOf(
            "id" to log.id,
            "userId" to (log.user?.id ?: ""),
            "userName" to ("${log.user?.firstName ?: ""} ${log.user?.lastName ?: ""}".trim()),
            "action" to log.action,
            "entityType" to log.entityType,
            "entityId" to log.entityId,
            "details" to log.details,
            "createdAt" to log.createdAt.toString()
        )
    }
}
```

- [ ] **Step 2: Add repository methods to AuditLogEntity**

Add to `AuditLogEntity.kt`:
```kotlin
interface AuditLogRepository : JpaRepository<AuditLogEntity, String> {
    fun findByEntityTypeOrderByCreatedAtDesc(entityType: String): List<AuditLogEntity>
    fun findAllByOrderByCreatedAtDesc(): List<AuditLogEntity>
}
```

- [ ] **Step 3: Create `api/src/main/kotlin/com/digihome/library/api/controller/AuditLogController.kt`**

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.AuditLogDbService
import com.digihome.library.api.models.ResponseModel
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
class AuditLogController(
    val auditLogDbService: AuditLogDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @GetMapping("/api/audit-logs")
    fun getAuditLogs(
        @RequestParam(required = false) entityType: String?,
        @RequestParam(defaultValue = "100") limit: Int
    ): ResponseEntity<ResponseModel> {
        return try {
            val logs = auditLogDbService.getAuditLogs(entityType, limit)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), logs), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}
```

- [ ] **Step 4: Commit**

---

### Task 6: Frontend Reservation Service + Pages

- [ ] **Step 1: Create `frontend/src/services/reservationService.ts`**

```typescript
import api from './api';
import type { ApiResponse } from '../types';

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookName: string;
  branchId: string;
  branchName: string;
  status: 'PENDING' | 'READY' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED';
  queuePosition: number;
  reservedAt: string;
  notifiedAt: string | null;
  expiresAt: string | null;
}

export const reservationService = {
  async reserveBook(bookId: string, branchId: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/reservations', { bookId, branchId });
    return response.data;
  },

  async cancelReservation(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/reservations/${id}/cancel`);
    return response.data;
  },

  async getMyReservations(): Promise<ApiResponse<Reservation[]>> {
    const response = await api.get<ApiResponse<Reservation[]>>('/reservations/my');
    return response.data;
  },

  async getAllReservations(): Promise<ApiResponse<Reservation[]>> {
    const response = await api.get<ApiResponse<Reservation[]>>('/reservations');
    return response.data;
  },

  async markReady(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/reservations/${id}/ready`);
    return response.data;
  },

  async fulfillReservation(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/reservations/${id}/fulfill`);
    return response.data;
  },
};
```

- [ ] **Step 2: Create `frontend/src/services/branchService.ts`**

```typescript
import api from './api';
import type { ApiResponse } from '../types';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface BranchCreateRequest {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export const branchService = {
  async getAllBranches(): Promise<ApiResponse<Branch[]>> {
    const response = await api.get<ApiResponse<Branch[]>>('/branches');
    return response.data;
  },

  async getBranch(id: string): Promise<ApiResponse<Branch>> {
    const response = await api.get<ApiResponse<Branch>>(`/branches/${id}`);
    return response.data;
  },

  async createBranch(data: BranchCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/branches', data);
    return response.data;
  },

  async updateBranch(id: string, data: BranchCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>(`/branches/${id}`, data);
    return response.data;
  },

  async deleteBranch(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/branches/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 3: Commit**

---

### Task 7: Frontend Pages (Reservations, Branches, Audit Log)

- [ ] **Step 1: Create `frontend/src/pages/member/ReservationsPage.tsx` and `.css`**

- [ ] **Step 2: Create `frontend/src/pages/admin/BranchListPage.tsx` and `.css`**

- [ ] **Step 3: Create `frontend/src/pages/admin/BranchFormPage.tsx` and `.css`**

- [ ] **Step 4: Create `frontend/src/pages/admin/AuditLogPage.tsx` and `.css`**

- [ ] **Step 5: Commit**

---

### Task 8: Routing + Navigation + BookDetail Reserve Button

- [ ] **Step 1: Update `frontend/src/App.tsx`** — add routes for reservations, branches, audit log

- [ ] **Step 2: Update `frontend/src/components/Layout.tsx`** — add Reservations, Branches, Audit Log nav items

- [ ] **Step 3: Update `frontend/src/pages/member/BookDetailPage.tsx`** — add "Reserve" button when no copies available

- [ ] **Step 4: Commit**
