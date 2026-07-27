# Sprint 4: Checkout/Return + QR Self-Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** QR-based self-checkout and return. Desk operations for librarians. 3-book limit enforced. Due dates tracked.

**Architecture:** New CheckoutService with business validation (limits, availability, reservations). New CheckoutController under `/api/checkout` and `/api/return`. Frontend uses html5-qrcode for QR scanning. Existing BookIssueEntity and BookCopyEntity are extended with new repository methods.

**Tech Stack:** Kotlin, Spring Boot 3.3.5, Spring Data JPA, BCrypt, React 19, TypeScript, html5-qrcode, Zustand

## Global Constraints

- Java 17, Kotlin 1.9.25, Spring Boot 3.3.5
- MySQL 8.x (no schema changes — using existing tables)
- JWT auth with roles: ADMIN, LIBRARIAN, MEMBER
- Frontend: React 19, Vite 5.x, TypeScript
- All API responses use `ResponseModel` wrapper
- Business rules: 3 books per member, 21-day loan, no fines

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `api/src/main/kotlin/com/digihome/library/api/models/CheckoutModels.kt` | Request/response DTOs |
| `api/src/main/kotlin/com/digihome/library/api/database/dbservice/CheckoutDbService.kt` | Checkout/return/renew logic |
| `api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt` | REST endpoints |

### Backend — Modified Files
| File | Change |
|------|--------|
| `api/src/main/kotlin/com/digihome/library/api/database/entity/BookIssueEntity.kt` | Add repository query methods |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/services/checkoutService.ts` | Checkout/return API calls |
| `frontend/src/pages/member/MyBooksPage.tsx` | Active checkouts with due dates |
| `frontend/src/pages/member/QRScannerPage.tsx` | QR scan checkout/return |
| `frontend/src/pages/librarian/CheckoutDeskPage.tsx` | Librarian checkout/return desk |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add checkout types |
| `frontend/src/App.tsx` | Add checkout routes |
| `frontend/src/components/Layout.tsx` | Add My Books / Checkout Desk nav |

---

### Task 1: Checkout Models (DTOs)

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/models/CheckoutModels.kt`**

```kotlin
package com.digihome.library.api.models

import java.time.LocalDateTime

data class CheckoutRequest(
    var userId: String = "",
    var copyId: String = ""
)

data class ReturnRequest(
    var copyId: String = ""
)

data class ScanCheckoutRequest(
    var barcode: String = ""
)

data class ScanReturnRequest(
    var barcode: String = ""
)

data class RenewRequest(
    var issueId: String = ""
)

data class CheckoutResponse(
    var id: String = "",
    var userId: String = "",
    var userName: String = "",
    var copyId: String = "",
    var bookId: String = "",
    var bookName: String = "",
    var barcode: String = "",
    var branchName: String = "",
    var issueDate: String = "",
    var dueDate: String = "",
    var returnDate: String? = null,
    var renewed: Boolean = false
)
```

- [ ] **Step 2: Commit**

---

### Task 2: BookIssueRepository Updates

- [ ] **Step 1: Add methods to BookIssueRepository in `BookIssueEntity.kt`**

```kotlin
interface BookIssueRepository : JpaRepository<BookIssueEntity, String> {
    fun findByUserIdAndReturnDateIsNull(userId: String): List<BookIssueEntity>
    fun findByCopyIdAndReturnDateIsNull(copyId: String): BookIssueEntity?
    fun countByUserIdAndReturnDateIsNull(userId: String): Long

    @Query("SELECT bi FROM BookIssueEntity bi WHERE bi.user.id = :userId ORDER BY bi.issueDate DESC")
    fun findAllByUserIdOrderByIssueDateDesc(@Param("userId") userId: String): List<BookIssueEntity>

    @Query("SELECT bi FROM BookIssueEntity bi WHERE bi.returnDate IS NULL AND bi.dueDate < :now")
    fun findOverdueIssues(@Param("now") now: java.time.LocalDateTime): List<BookIssueEntity>
}
```

- [ ] **Step 2: Commit**

---

### Task 3: CheckoutDbService

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/database/dbservice/CheckoutDbService.kt`**

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.CopyStatus
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
class CheckoutDbService(
    val bookIssueRepository: BookIssueRepository,
    val bookCopyRepository: BookCopyRepository,
    val booksRepository: BooksRepository,
    val userRepository: UserRepository,
    val branchRepository: BranchRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")
    private val MAX_BOOKS_PER_MEMBER = 3
    private val LOAN_PERIOD_DAYS = 21L

    fun checkout(request: CheckoutRequest): ServiceResponseModel {
        // Validate user exists
        val user = userRepository.findById(request.userId)
            .orElseThrow { Exception("User not found: ${request.userId}") }

        // Validate copy exists and is available
        val copy = bookCopyRepository.findById(request.copyId)
            .orElseThrow { Exception("Copy not found: ${request.copyId}") }

        if (copy.status != CopyStatus.AVAILABLE) {
            throw Exception("Copy is not available. Current status: ${copy.status}")
        }

        // Check 3-book limit
        val currentCheckouts = bookIssueRepository.countByUserIdAndReturnDateIsNull(request.userId)
        if (currentCheckouts >= MAX_BOOKS_PER_MEMBER) {
            throw Exception("Borrowing limit reached. Maximum $MAX_BOOKS_PER_MEMBER books allowed.")
        }

        // Check for duplicate checkout (same copy already checked out by same user)
        val existingIssue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(request.copyId)
        if (existingIssue != null) {
            throw Exception("This copy is already checked out")
        }

        // Create issue record
        val now = LocalDateTime.now()
        val issue = BookIssueEntity(
            id = java.util.UUID.randomUUID().toString(),
            user = user,
            copy = copy,
            issueDate = now,
            dueDate = now.plusDays(LOAN_PERIOD_DAYS)
        )
        bookIssueRepository.save(issue)

        // Update copy status
        copy.status = CopyStatus.LOANED
        copy.updatedAt = now
        bookCopyRepository.save(copy)

        return ServiceResponseModel(true, "Book checked out successfully. Due: ${issue.dueDate.format(dateFormatter)}")
    }

    fun returnBook(request: ReturnRequest): ServiceResponseModel {
        val copy = bookCopyRepository.findById(request.copyId)
            .orElseThrow { Exception("Copy not found: ${request.copyId}") }

        val issue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(request.copyId)
            ?: throw Exception("No active checkout found for this copy")

        // Mark as returned
        val now = LocalDateTime.now()
        issue.returnDate = now
        bookIssueRepository.save(issue)

        // Update copy status
        copy.status = CopyStatus.AVAILABLE
        copy.updatedAt = now
        bookCopyRepository.save(copy)

        return ServiceResponseModel(true, "Book returned successfully")
    }

    fun scanCheckout(request: ScanCheckoutRequest): ServiceResponseModel {
        val copy = bookCopyRepository.findByBarcode(request.barcode)
            ?: throw Exception("No copy found with barcode: ${request.barcode}")

        return checkout(CheckoutRequest(
            userId = "", // Will be set by controller from JWT
            copyId = copy.id
        ))
    }

    fun scanCheckoutForUser(userId: String, barcode: String): ServiceResponseModel {
        val copy = bookCopyRepository.findByBarcode(barcode)
            ?: throw Exception("No copy found with barcode: $barcode")

        return checkout(CheckoutRequest(userId = userId, copyId = copy.id))
    }

    fun scanReturn(request: ScanReturnRequest): ServiceResponseModel {
        val copy = bookCopyRepository.findByBarcode(request.barcode)
            ?: throw Exception("No copy found with barcode: ${request.barcode}")

        return returnBook(ReturnRequest(copyId = copy.id))
    }

    fun renewIssue(request: RenewRequest): ServiceResponseModel {
        val issue = bookIssueRepository.findById(request.issueId)
            .orElseThrow { Exception("Issue not found: ${request.issueId}") }

        if (issue.returnDate != null) {
            throw Exception("This book has already been returned")
        }

        if (issue.renewed) {
            throw Exception("This book has already been renewed once")
        }

        // Check if there are pending reservations for this book
        // (Simplification: allow renewal if no reservations exist)
        val book = issue.copy?.book
        if (book != null) {
            // Check reservations - if any pending, block renewal
            // This will be fully implemented in Sprint 5
        }

        // Extend due date by 21 days from current due date
        issue.dueDate = issue.dueDate.plusDays(LOAN_PERIOD_DAYS)
        issue.renewed = true
        issue.updatedAt = LocalDateTime.now()
        bookIssueRepository.save(issue)

        return ServiceResponseModel(true, "Book renewed. New due date: ${issue.dueDate.format(dateFormatter)}")
    }

    fun getMyCheckouts(userId: String): List<CheckoutResponse> {
        val issues = bookIssueRepository.findAllByUserIdOrderByIssueDateDesc(userId)
        return issues.map { mapToCheckoutResponse(it) }
    }

    fun getActiveCheckouts(userId: String): List<CheckoutResponse> {
        val issues = bookIssueRepository.findByUserIdAndReturnDateIsNull(userId)
        return issues.map { mapToCheckoutResponse(it) }
    }

    private fun mapToCheckoutResponse(issue: BookIssueEntity): CheckoutResponse {
        return CheckoutResponse(
            id = issue.id,
            userId = issue.user?.id ?: "",
            userName = "${issue.user?.firstName ?: ""} ${issue.user?.lastName ?: ""}".trim(),
            copyId = issue.copy?.id ?: "",
            bookId = issue.copy?.book?.id ?: "",
            bookName = issue.copy?.book?.bookName ?: "",
            barcode = issue.copy?.barcode ?: "",
            branchName = issue.copy?.branch?.name ?: "",
            issueDate = issue.issueDate.format(dateFormatter),
            dueDate = issue.dueDate.format(dateFormatter),
            returnDate = issue.returnDate?.format(dateFormatter),
            renewed = issue.renewed
        )
    }
}
```

- [ ] **Step 2: Commit**

---

### Task 4: CheckoutController

- [ ] **Step 1: Create `api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt`**

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.CheckoutDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
class CheckoutController(
    val checkoutDbService: CheckoutDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping("/api/checkout")
    fun checkout(@RequestBody request: CheckoutRequest): ResponseEntity<ResponseModel> {
        logger.info("Checkout request: user=${request.userId}, copy=${request.copyId}")
        return try {
            val response = checkoutDbService.checkout(request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Checkout failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/return")
    fun returnBook(@RequestBody request: ReturnRequest): ResponseEntity<ResponseModel> {
        logger.info("Return request: copy=${request.copyId}")
        return try {
            val response = checkoutDbService.returnBook(request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Return failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/checkout/scan")
    fun scanCheckout(
        @RequestHeader("X-User-Id") userId: String,
        @RequestBody request: ScanCheckoutRequest
    ): ResponseEntity<ResponseModel> {
        logger.info("Scan checkout: barcode=${request.barcode}")
        return try {
            val response = checkoutDbService.scanCheckoutForUser(userId, request.barcode)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Scan checkout failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/return/scan")
    fun scanReturn(@RequestBody request: ScanReturnRequest): ResponseEntity<ResponseModel> {
        logger.info("Scan return: barcode=${request.barcode}")
        return try {
            val response = checkoutDbService.scanReturn(request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Scan return failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/checkout/{id}/renew")
    fun renewIssue(@PathVariable id: String): ResponseEntity<ResponseModel> {
        logger.info("Renew request: issue=$id")
        return try {
            val response = checkoutDbService.renewIssue(RenewRequest(issueId = id))
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Renew failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping("/api/checkout/my")
    fun myCheckouts(@RequestHeader("X-User-Id") userId: String): ResponseEntity<ResponseModel> {
        logger.info("My checkouts: user=$userId")
        return try {
            val checkouts = checkoutDbService.getActiveCheckouts(userId)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), checkouts), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Get checkouts failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/api/checkout/history")
    fun checkoutHistory(
        @RequestHeader("X-User-Id") userId: String
    ): ResponseEntity<ResponseModel> {
        logger.info("Checkout history: user=$userId")
        return try {
            val checkouts = checkoutDbService.getMyCheckouts(userId)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), checkouts), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Get history failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}
```

- [ ] **Step 2: Commit**

---

### Task 5: Frontend Checkout Types + Service

- [ ] **Step 1: Add checkout types to `frontend/src/types/index.ts`**

```typescript
// --- Checkout Types ---

export interface CheckoutRequest {
  userId: string;
  copyId: string;
}

export interface ReturnRequest {
  copyId: string;
}

export interface ScanCheckoutRequest {
  barcode: string;
}

export interface ScanReturnRequest {
  barcode: string;
}

export interface RenewRequest {
  issueId: string;
}

export interface CheckoutResponse {
  id: string;
  userId: string;
  userName: string;
  copyId: string;
  bookId: string;
  bookName: string;
  barcode: string;
  branchName: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  renewed: boolean;
}
```

- [ ] **Step 2: Create `frontend/src/services/checkoutService.ts`**

```typescript
import api from './api';
import type {
  CheckoutResponse,
  CheckoutRequest,
  ReturnRequest,
  ScanCheckoutRequest,
  ScanReturnRequest,
  RenewRequest,
  ApiResponse,
} from '../types';

export const checkoutService = {
  async checkout(data: CheckoutRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/checkout', data);
    return response.data;
  },

  async returnBook(data: ReturnRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/return', data);
    return response.data;
  },

  async scanCheckout(data: ScanCheckoutRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/checkout/scan', data);
    return response.data;
  },

  async scanReturn(data: ScanReturnRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/return/scan', data);
    return response.data;
  },

  async renewIssue(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/checkout/${id}/renew`);
    return response.data;
  },

  async getMyCheckouts(): Promise<ApiResponse<CheckoutResponse[]>> {
    const response = await api.get<ApiResponse<CheckoutResponse[]>>('/checkout/my');
    return response.data;
  },

  async getCheckoutHistory(): Promise<ApiResponse<CheckoutResponse[]>> {
    const response = await api.get<ApiResponse<CheckoutResponse[]>>('/checkout/history');
    return response.data;
  },
};
```

- [ ] **Step 3: Commit**

---

### Task 6: My Books Page (Member)

- [ ] **Step 1: Create `frontend/src/pages/member/MyBooksPage.tsx` and `.css`**

- [ ] **Step 2: Commit**

---

### Task 7: QR Scanner Page (Member)

- [ ] **Step 1: Create `frontend/src/pages/member/QRScannerPage.tsx` and `.css`**

- [ ] **Step 2: Commit**

---

### Task 8: Checkout Desk Page (Librarian)

- [ ] **Step 1: Create `frontend/src/pages/librarian/CheckoutDeskPage.tsx` and `.css`**

- [ ] **Step 2: Commit**

---

### Task 9: Routing + Navigation Updates

- [ ] **Step 1: Update App.tsx and Layout.tsx**

- [ ] **Step 2: Commit**
