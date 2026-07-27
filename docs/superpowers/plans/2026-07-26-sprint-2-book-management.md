# Sprint 2: Book Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin/Librarians can manage books and copies. Members can browse catalog with search/filters. ISBN auto-fetch works. Copies tracked per branch.

**Architecture:** New RESTful controllers under `/api/books/` and `/api/categories/` with dedicated service classes. Frontend uses AG Grid for admin tables, TanStack Query for server state, and co-located CSS per page. Existing legacy endpoints (`/books/add`, `/books/issue`, etc.) remain untouched.

**Tech Stack:** Kotlin, Spring Boot 3.3.5, Spring Data JPA, Open Library API (ISBN lookup), React 19, TypeScript, AG Grid Community, TanStack Query, Zustand, CSS custom properties

## Global Constraints

- Java 17, Kotlin 1.9.25, Spring Boot 3.3.5
- MySQL 8.x with Flyway migrations (no schema changes this sprint — using existing tables)
- JWT auth with roles: ADMIN, LIBRARIAN, MEMBER
- Frontend: React 19, Vite 5.x, TypeScript strict mode
- All API responses use `ResponseModel` wrapper: `{ success, message, code, data }`
- IDs are UUID strings
- No test infrastructure yet (deferred to Sprint 7)
- Frontend CSS uses custom properties from `index.css` (`--bg-primary`, `--accent`, etc.)

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `api/src/main/kotlin/com/digihome/library/api/models/BookManagementModels.kt` | Request/response DTOs for books, copies, categories, search |
| `api/src/main/kotlin/com/digihome/library/api/database/dbservice/BookManagementDbService.kt` | Book CRUD, copy management, search logic |
| `api/src/main/kotlin/com/digihome/library/api/database/dbservice/CategoryDbService.kt` | Category CRUD logic |
| `api/src/main/kotlin/com/digihome/library/api/service/OpenLibraryService.kt` | ISBN auto-fetch from Open Library API |
| `api/src/main/kotlin/com/digihome/library/api/controller/BookManagementController.kt` | REST endpoints for books |
| `api/src/main/kotlin/com/digihome/library/api/controller/CategoryController.kt` | REST endpoints for categories |

### Backend — Modified Files
| File | Change |
|------|--------|
| `api/src/main/kotlin/com/digihome/library/api/database/entity/BooksEntity.kt` | Add repository query methods |
| `api/src/main/kotlin/com/digihome/library/api/database/entity/BookCopyEntity.kt` | Add repository query methods |
| `api/src/main/kotlin/com/digihome/library/api/database/entity/CategoryEntity.kt` | Add repository query methods |
| `api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt` | Allow catalog browsing without ADMIN role |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/services/bookService.ts` | Book + copy API calls |
| `frontend/src/services/categoryService.ts` | Category API calls |
| `frontend/src/pages/admin/BookListPage.tsx` | AG Grid book list with actions |
| `frontend/src/pages/admin/BookFormPage.tsx` | Add/Edit book form with ISBN lookup |
| `frontend/src/pages/admin/CategoryListPage.tsx` | Category list + create/edit |
| `frontend/src/pages/member/CatalogPage.tsx` | Browse catalog with search + filters |
| `frontend/src/pages/member/BookDetailPage.tsx` | Book detail with availability per branch |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add BookSearchParams, PaginatedResponse, Category, BookCopyDetail types |
| `frontend/src/App.tsx` | Add new routes for all pages |
| `frontend/src/components/Layout.tsx` | Add Books/Categories/Catalog nav items |
| `frontend/package.json` | Add ag-grid-community + @ag-grid-community/react dependencies |

---

### Task 1: Book Management Models (DTOs)

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/models/BookManagementModels.kt`

**Interfaces:**
- Consumes: `ResponseModel` (existing), `CopyStatus` enum, `ReservationStatus` enum
- Produces: `BookCreateRequest`, `BookUpdateRequest`, `BookResponse`, `BookCopyRequest`, `BookCopyResponse`, `BookSearchParams`, `PagedResponse`, `CategoryCreateRequest`, `CategoryResponse`, `IsbnLookupResponse`, `BookTransferRequest`

- [ ] **Step 1: Create BookManagementModels.kt with all DTOs**

```kotlin
package com.digihome.library.api.models

import com.digihome.library.api.database.enums.CopyStatus

// --- Book DTOs ---

data class BookCreateRequest(
    var isbn: String = "",
    var bookName: String = "",
    var author: String = "",
    var publication: String = "",
    var language: String = "",
    var location: String = "",
    var description: String = "",
    var coverImageUrl: String = "",
    var categoryId: String? = null
)

data class BookUpdateRequest(
    var isbn: String? = null,
    var bookName: String? = null,
    var author: String? = null,
    var publication: String? = null,
    var language: String? = null,
    var location: String? = null,
    var description: String? = null,
    var coverImageUrl: String? = null,
    var categoryId: String? = null
)

data class BookResponse(
    var id: String = "",
    var isbn: String = "",
    var bookName: String = "",
    var author: String = "",
    var publication: String = "",
    var language: String = "",
    var location: String = "",
    var description: String = "",
    var coverImageUrl: String = "",
    var categoryId: String? = null,
    var categoryName: String? = null,
    var availableCopies: Int = 0,
    var totalCopies: Int = 0,
    var createdAt: String = "",
    var updatedAt: String = ""
)

// --- Book Copy DTOs ---

data class BookCopyRequest(
    var branchId: String = "",
    var quantity: Int = 1,
    var barcodes: List<String> = emptyList()
)

data class BookCopyResponse(
    var id: String = "",
    var bookId: String = "",
    var bookName: String = "",
    var branchId: String = "",
    var branchName: String = "",
    var barcode: String = "",
    var status: CopyStatus = CopyStatus.AVAILABLE,
    var createdAt: String = "",
    var updatedAt: String = ""
)

data class BookTransferRequest(
    var copyId: String = "",
    var fromBranchId: String = "",
    var toBranchId: String = ""
)

// --- Search DTOs ---

data class BookSearchParams(
    var q: String? = null,
    var categoryId: String? = null,
    var language: String? = null,
    var available: Boolean? = null,
    var page: Int = 1,
    var size: Int = 20,
    var sortBy: String = "createdAt",
    var sortDir: String = "desc"
)

data class PagedResponse<T>(
    val success: Boolean = true,
    val message: String? = null,
    val code: Int = 200,
    val data: List<T> = emptyList(),
    val total: Long = 0,
    val page: Int = 1,
    val size: Int = 20,
    val totalPages: Int = 0
)

// --- Category DTOs ---

data class CategoryCreateRequest(
    var name: String = "",
    var parentId: String? = null
)

data class CategoryResponse(
    var id: String = "",
    var name: String = "",
    var parentId: String? = null,
    var parentName: String? = null,
    var createdAt: String = ""
)

// --- ISBN Lookup DTO ---

data class IsbnLookupResponse(
    var isbn: String = "",
    var title: String = "",
    var author: String = "",
    var publication: String = "",
    var language: String = "",
    var coverImageUrl: String = "",
    var description: String = ""
)
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/models/BookManagementModels.kt
git commit -m "feat: add book management DTOs for Sprint 2"
```

---

### Task 2: Repository Query Methods

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/BooksEntity.kt:44-50`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/BookCopyEntity.kt:36-41`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/CategoryEntity.kt:28-30`

**Interfaces:**
- Consumes: existing entity classes
- Produces: updated repository interfaces with new query methods

- [ ] **Step 1: Update BooksRepository with search and pagination methods**

In `BooksEntity.kt`, replace the `BooksRepository` interface:

```kotlin
interface BooksRepository : JpaRepository<BooksEntity, String> {
    fun findAllByOrderByCreatedAtDesc(): List<BooksEntity>?
    fun findByLanguageOrderByBookNameAsc(language: String): List<BooksEntity>?
    fun findByBookNameContainingIgnoreCaseOrAuthorContainingIgnoreCaseOrIsbnContaining(
        bookName: String, author: String, isbn: String
    ): List<BooksEntity>

    // Sprint 2 methods
    fun findByCategoryIdOrderByBookNameAsc(categoryId: String): List<BooksEntity>
    fun findByLanguageContainingIgnoreCaseOrderByBookNameAsc(language: String): List<BooksEntity>

    @Query("SELECT b FROM BooksEntity b WHERE " +
           "(:q IS NULL OR LOWER(b.bookName) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(b.author) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(b.isbn) LIKE LOWER(CONCAT('%',:q,'%'))) " +
           "AND (:categoryId IS NULL OR b.category.id = :categoryId) " +
           "AND (:language IS NULL OR LOWER(b.language) LIKE LOWER(CONCAT('%',:language,'%'))) " +
           "ORDER BY b.createdAt DESC")
    fun searchBooks(
        @Param("q") q: String?,
        @Param("categoryId") categoryId: String?,
        @Param("language") language: String?,
        pageable: Pageable
    ): Page<BooksEntity>
}
```

Add the import at the top of the file:
```kotlin
import org.springframework.data.jpa.repository.Query
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.repository.query.Param
```

- [ ] **Step 2: Update BookCopyRepository with availability queries**

In `BookCopyEntity.kt`, replace the `BookCopyRepository` interface:

```kotlin
interface BookCopyRepository : JpaRepository<BookCopyEntity, String> {
    fun findByBookId(bookId: String): List<BookCopyEntity>
    fun findByBookIdAndBranchId(bookId: String, branchId: String): List<BookCopyEntity>
    fun findByBarcode(barcode: String): BookCopyEntity?
    fun countByBookIdAndStatus(bookId: String, status: CopyStatus): Long

    // Sprint 2 methods
    fun countByBookId(bookId: String): Long
    fun findByBranchId(branchId: String): List<BookCopyEntity>
    fun findByStatus(status: CopyStatus): List<BookCopyEntity>

    @Query("SELECT bc FROM BookCopyEntity bc WHERE bc.book.id = :bookId AND bc.status = 'AVAILABLE'")
    fun findAvailableCopiesByBookId(@Param("bookId") bookId: String): List<BookCopyEntity>

    @Query("SELECT bc FROM BookCopyEntity bc WHERE bc.branch.id = :branchId AND bc.status = 'AVAILABLE'")
    fun findAvailableCopiesByBranchId(@Param("branchId") branchId: String): List<BookCopyEntity>
}
```

Add the import at the top:
```kotlin
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
```

- [ ] **Step 3: Update CategoryRepository**

In `CategoryEntity.kt`, replace the `CategoryRepository` interface:

```kotlin
interface CategoryRepository : JpaRepository<CategoryEntity, String> {
    fun findByName(name: String): CategoryEntity?
    fun findByParentIdIsNullOrderByNameAsc(): List<CategoryEntity>
    fun findByParentIdOrderByNameAsc(parentId: String): List<CategoryEntity>
    fun findAllByOrderByNameAsc(): List<CategoryEntity>
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/entity/BooksEntity.kt \
        api/src/main/kotlin/com/digihome/library/api/database/entity/BookCopyEntity.kt \
        api/src/main/kotlin/com/digihome/library/api/database/entity/CategoryEntity.kt
git commit -m "feat: add repository query methods for book search and availability"
```

---

### Task 3: Book Management Service

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/database/dbservice/BookManagementDbService.kt`

**Interfaces:**
- Consumes: `BooksRepository`, `BookCopyRepository`, `CategoryRepository`, `BranchRepository`, DTOs from Task 1
- Produces: `BookManagementDbService` with methods: `createBook`, `updateBook`, `getBookById`, `listBooks`, `searchBooks`, `addCopies`, `getCopies`, `transferCopy`, `generateQrCode`

- [ ] **Step 1: Create BookManagementDbService.kt**

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.CopyStatus
import com.digihome.library.api.models.*
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.*

@Service
class BookManagementDbService(
    val booksRepository: BooksRepository,
    val bookCopyRepository: BookCopyRepository,
    val categoryRepository: CategoryRepository,
    val branchRepository: BranchRepository,
    val restTemplate: RestTemplate,
    val objectMapper: ObjectMapper
) {
    val logger = LoggerFactory.getLogger(this::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

    @Value("\${qrcode-url}")
    lateinit var qrCodeApiUrl: String

    // --- Book CRUD ---

    fun createBook(request: BookCreateRequest): ServiceResponseModel {
        val category = request.categoryId?.let {
            categoryRepository.findById(it).orElseThrow { Exception("Category not found: $it") }
        }

        val book = BooksEntity(
            id = UUID.randomUUID().toString(),
            isbn = request.isbn,
            bookName = request.bookName,
            author = request.author,
            publication = request.publication,
            language = request.language,
            location = request.location,
            description = request.description,
            coverImageUrl = request.coverImageUrl,
            category = category
        )

        booksRepository.save(book)
        return ServiceResponseModel(true, "Book created successfully")
    }

    fun updateBook(bookId: String, request: BookUpdateRequest): ServiceResponseModel {
        val book = booksRepository.findById(bookId)
            .orElseThrow { Exception("Book not found: $bookId") }

        request.isbn?.let { book.isbn = it }
        request.bookName?.let { book.bookName = it }
        request.author?.let { book.author = it }
        request.publication?.let { book.publication = it }
        request.language?.let { book.language = it }
        request.location?.let { book.location = it }
        request.description?.let { book.description = it }
        request.coverImageUrl?.let { book.coverImageUrl = it }
        request.categoryId?.let { catId ->
            val category = categoryRepository.findById(catId)
                .orElseThrow { Exception("Category not found: $catId") }
            book.category = category
        }
        book.updatedAt = LocalDateTime.now()

        booksRepository.save(book)
        return ServiceResponseModel(true, "Book updated successfully")
    }

    fun getBookById(bookId: String): BookResponse? {
        val book = booksRepository.findById(bookId).orElse(null) ?: return null
        return mapToBookResponse(book)
    }

    fun listBooks(page: Int, size: Int): PagedResponse<BookResponse> {
        val pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        val pageResult = booksRepository.findAll(pageable)

        return PagedResponse(
            success = true,
            data = pageResult.content.map { mapToBookResponse(it) },
            total = pageResult.totalElements,
            page = page,
            size = size,
            totalPages = pageResult.totalPages
        )
    }

    fun searchBooks(params: BookSearchParams): PagedResponse<BookResponse> {
        val pageable = PageRequest.of(
            params.page - 1,
            params.size,
            Sort.by(Sort.Direction.fromString(params.sortDir.uppercase()), params.sortBy)
        )

        val pageResult = booksRepository.searchBooks(
            params.q,
            params.categoryId,
            params.language,
            pageable
        )

        var books = pageResult.content.map { mapToBookResponse(it) }

        // Filter by availability if requested
        if (params.available == true) {
            books = books.filter { it.availableCopies > 0 }
        }

        return PagedResponse(
            success = true,
            data = books,
            total = pageResult.totalElements,
            page = params.page,
            size = params.size,
            totalPages = pageResult.totalPages
        )
    }

    // --- Copy Management ---

    fun addCopies(bookId: String, request: BookCopyRequest): ServiceResponseModel {
        val book = booksRepository.findById(bookId)
            .orElseThrow { Exception("Book not found: $bookId") }

        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { Exception("Branch not found: ${request.branchId}") }

        val copiesToAdd = if (request.barcodes.isNotEmpty()) {
            request.barcodes
        } else {
            (1..request.quantity).map { "BC-${UUID.randomUUID().toString().substring(0, 8).uppercase()}" }
        }

        copiesToAdd.forEach { barcode ->
            val copy = BookCopyEntity(
                id = UUID.randomUUID().toString(),
                book = book,
                branch = branch,
                barcode = barcode,
                status = CopyStatus.AVAILABLE
            )
            bookCopyRepository.save(copy)
        }

        return ServiceResponseModel(true, "${copiesToAdd.size} copies added successfully")
    }

    fun getCopies(bookId: String): List<BookCopyResponse> {
        val copies = bookCopyRepository.findByBookId(bookId)
        return copies.map { mapToCopyResponse(it) }
    }

    fun transferCopy(request: BookTransferRequest): ServiceResponseModel {
        val copy = bookCopyRepository.findById(request.copyId)
            .orElseThrow { Exception("Copy not found: ${request.copyId}") }

        val toBranch = branchRepository.findById(request.toBranchId)
            .orElseThrow { Exception("Destination branch not found: ${request.toBranchId}") }

        if (copy.status != CopyStatus.AVAILABLE) {
            throw Exception("Only available copies can be transferred. Current status: ${copy.status}")
        }

        copy.branch = toBranch
        copy.updatedAt = LocalDateTime.now()
        bookCopyRepository.save(copy)

        return ServiceResponseModel(true, "Copy transferred successfully")
    }

    fun generateQrCode(bookId: String): ByteArray? {
        val book = booksRepository.findById(bookId).orElse(null) ?: return null

        val qrData = objectMapper.writeValueAsString(mapOf(
            "id" to book.id,
            "bookName" to book.bookName,
            "author" to book.author,
            "isbn" to book.isbn
        ))

        return try {
            restTemplate.getForObject(qrCodeApiUrl, ByteArray::class.java, qrData)
        } catch (e: Exception) {
            logger.error("QR code generation failed: ${e.message}")
            null
        }
    }

    // --- Helpers ---

    private fun mapToBookResponse(book: BooksEntity): BookResponse {
        val totalCopies = bookCopyRepository.countByBookId(book.id).toInt()
        val availableCopies = bookCopyRepository.countByBookIdAndStatus(book.id, CopyStatus.AVAILABLE).toInt()

        return BookResponse(
            id = book.id,
            isbn = book.isbn,
            bookName = book.bookName,
            author = book.author,
            publication = book.publication,
            language = book.language,
            location = book.location,
            description = book.description,
            coverImageUrl = book.coverImageUrl,
            categoryId = book.category?.id,
            categoryName = book.category?.name,
            availableCopies = availableCopies,
            totalCopies = totalCopies,
            createdAt = book.createdAt.format(dateFormatter),
            updatedAt = book.updatedAt.format(dateFormatter)
        )
    }

    private fun mapToCopyResponse(copy: BookCopyEntity): BookCopyResponse {
        return BookCopyResponse(
            id = copy.id,
            bookId = copy.book?.id ?: "",
            bookName = copy.book?.bookName ?: "",
            branchId = copy.branch?.id ?: "",
            branchName = copy.branch?.name ?: "",
            barcode = copy.barcode,
            status = copy.status,
            createdAt = copy.createdAt.format(dateFormatter),
            updatedAt = copy.updatedAt.format(dateFormatter)
        )
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/dbservice/BookManagementDbService.kt
git commit -m "feat: add BookManagementDbService with CRUD, search, and copy management"
```

---

### Task 4: ISBN Lookup Service

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/service/OpenLibraryService.kt`

**Interfaces:**
- Consumes: `RestTemplate`, `ObjectMapper`
- Produces: `OpenLibraryService` with `lookupIsbn(isbn: String): IsbnLookupResponse?`

- [ ] **Step 1: Create OpenLibraryService.kt**

```kotlin
package com.digihome.library.api.service

import com.digihome.library.api.models.IsbnLookupResponse
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class OpenLibraryService(
    val restTemplate: RestTemplate,
    val objectMapper: ObjectMapper
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    private val baseUrl = "https://openlibrary.org"

    fun lookupIsbn(isbn: String): IsbnLookupResponse? {
        return try {
            val url = "$baseUrl/isbn/$isbn.json"
            val response = restTemplate.getForObject(url, String::class.java) ?: return null

            val json = objectMapper.readTree(response)

            val title = json.path("title").asText("")
            val authors = extractAuthors(json)
            val publishers = extractPublishers(json)
            val publishDate = json.path("first_publish_date").asText("")
            val cover = extractCover(json, isbn)
            val description = extractDescription(json)

            IsbnLookupResponse(
                isbn = isbn,
                title = title,
                author = authors,
                publication = publishers,
                language = "English", // Open Library doesn't always provide this
                coverImageUrl = cover,
                description = description
            )
        } catch (e: Exception) {
            logger.warn("ISBN lookup failed for $isbn: ${e.message}")
            null
        }
    }

    private fun extractAuthors(json: JsonNode): String {
        val authorKeys = json.path("authors")
        if (!authorKeys.isArray || authorKeys.size() == 0) return ""

        return authorKeys.map { authorRef ->
            val authorKey = authorRef.path("key").asText()
            if (authorKey.isNotEmpty()) {
                try {
                    val authorJson = restTemplate.getForObject("$baseUrl$authorKey.json", String::class.java)
                    authorJson?.let { objectMapper.readTree(it).path("name").asText("") } ?: ""
                } catch (e: Exception) {
                    ""
                }
            } else ""
        }.filter { it.isNotEmpty() }.joinToString(", ")
    }

    private fun extractPublishers(json: JsonNode): String {
        val publishers = json.path("publishers")
        return if (publishers.isArray) {
            publishers.map { it.asText() }.filter { it.isNotEmpty() }.joinToString(", ")
        } else {
            json.path("publisher").asText("")
        }
    }

    private fun extractCover(json: JsonNode, isbn: String): String {
        val cover = json.path("cover")
        return if (cover.isObject) {
            cover.path("large").asText("")
                .ifEmpty { cover.path("medium").asText("") }
                .ifEmpty { cover.path("small").asText("") }
        } else {
            // Fallback to Open Library cover API
            "https://covers.openlibrary.org/b/isbn/$isbn-L.jpg"
        }
    }

    private fun extractDescription(json: JsonNode): String {
        val desc = json.path("description")
        return when {
            desc.isTextual -> desc.asText()
            desc.isObject -> desc.path("value").asText()
            else -> ""
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/service/OpenLibraryService.kt
git commit -m "feat: add OpenLibraryService for ISBN auto-fetch"
```

---

### Task 5: Book Management Controller

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/controller/BookManagementController.kt`

**Interfaces:**
- Consumes: `BookManagementDbService`, `OpenLibraryService`, DTOs from Task 1
- Produces: REST endpoints matching Sprint 2 spec

- [ ] **Step 1: Create BookManagementController.kt**

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.BookManagementDbService
import com.digihome.library.api.models.*
import com.digihome.library.api.service.OpenLibraryService
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/books")
class BookManagementController(
    val bookManagementDbService: BookManagementDbService,
    val openLibraryService: OpenLibraryService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping
    fun createBook(@RequestBody request: BookCreateRequest): ResponseEntity<ResponseModel> {
        logger.info("Create book request: ${request.bookName}")
        return try {
            val response = bookManagementDbService.createBook(request)
            ResponseEntity(response, HttpStatus.CREATED)
        } catch (e: Exception) {
            logger.error("Create book failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PutMapping("/{id}")
    fun updateBook(@PathVariable id: String, @RequestBody request: BookUpdateRequest): ResponseEntity<ResponseModel> {
        logger.info("Update book request: $id")
        return try {
            val response = bookManagementDbService.updateBook(id, request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Update book failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping("/{id}")
    fun getBook(@PathVariable id: String): ResponseEntity<ResponseModel> {
        logger.info("Get book request: $id")
        return try {
            val book = bookManagementDbService.getBookById(id)
            if (book != null) {
                ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), book), HttpStatus.OK)
            } else {
                ResponseEntity(
                    ResponseModel(success = false, message = "Book not found", code = HttpStatus.NOT_FOUND.value()),
                    HttpStatus.NOT_FOUND
                )
            }
        } catch (e: Exception) {
            logger.error("Get book failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping
    fun listBooks(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<PagedResponse<BookResponse>> {
        logger.info("List books: page=$page, size=$size")
        return try {
            val response = bookManagementDbService.listBooks(page, size)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("List books failed: ${e.message}")
            ResponseEntity(
                PagedResponse(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/search")
    fun searchBooks(
        @RequestParam(required = false) q: String?,
        @RequestParam(required = false) categoryId: String?,
        @RequestParam(required = false) language: String?,
        @RequestParam(required = false) available: Boolean?,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(defaultValue = "createdAt") sortBy: String,
        @RequestParam(defaultValue = "desc") sortDir: String
    ): ResponseEntity<PagedResponse<BookResponse>> {
        logger.info("Search books: q=$q, category=$categoryId, language=$language")
        return try {
            val params = BookSearchParams(q, categoryId, language, available, page, size, sortBy, sortDir)
            val response = bookManagementDbService.searchBooks(params)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Search books failed: ${e.message}")
            ResponseEntity(
                PagedResponse(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/isbn/{isbn}")
    fun lookupIsbn(@PathVariable isbn: String): ResponseEntity<ResponseModel> {
        logger.info("ISBN lookup: $isbn")
        return try {
            val result = openLibraryService.lookupIsbn(isbn)
            if (result != null) {
                ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), result), HttpStatus.OK)
            } else {
                ResponseEntity(
                    ResponseModel(success = false, message = "ISBN not found", code = HttpStatus.NOT_FOUND.value()),
                    HttpStatus.NOT_FOUND
                )
            }
        } catch (e: Exception) {
            logger.error("ISBN lookup failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @PostMapping("/{id}/copies")
    fun addCopies(@PathVariable id: String, @RequestBody request: BookCopyRequest): ResponseEntity<ResponseModel> {
        logger.info("Add copies request: book=$id, quantity=${request.quantity}")
        return try {
            val response = bookManagementDbService.addCopies(id, request)
            ResponseEntity(response, HttpStatus.CREATED)
        } catch (e: Exception) {
            logger.error("Add copies failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping("/{id}/copies")
    fun getCopies(@PathVariable id: String): ResponseEntity<ResponseModel> {
        logger.info("Get copies request: book=$id")
        return try {
            val copies = bookManagementDbService.getCopies(id)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), copies), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Get copies failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @PostMapping("/{id}/transfer")
    fun transferCopy(@PathVariable id: String, @RequestBody request: BookTransferRequest): ResponseEntity<ResponseModel> {
        logger.info("Transfer copy request: copy=${request.copyId}, to=${request.toBranchId}")
        return try {
            val response = bookManagementDbService.transferCopy(request)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Transfer copy failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping("/{id}/qr")
    fun getQrCode(@PathVariable id: String): ResponseEntity<ByteArray> {
        logger.info("QR code request: book=$id")
        return try {
            val qrCode = bookManagementDbService.generateQrCode(id)
            if (qrCode != null) {
                val headers = HttpHeaders().apply {
                    contentType = MediaType.IMAGE_PNG
                }
                ResponseEntity(qrCode, headers, HttpStatus.OK)
            } else {
                ResponseEntity(HttpStatus.NOT_FOUND)
            }
        } catch (e: Exception) {
            logger.error("QR code generation failed: ${e.message}")
            ResponseEntity(HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/controller/BookManagementController.kt
git commit -m "feat: add BookManagementController with full REST API"
```

---

### Task 6: Category Management (Service + Controller)

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/database/dbservice/CategoryDbService.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/controller/CategoryController.kt`

**Interfaces:**
- Consumes: `CategoryRepository`, DTOs from Task 1
- Produces: `CategoryDbService` (create, list), `CategoryController` (REST endpoints)

- [ ] **Step 1: Create CategoryDbService.kt**

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.CategoryEntity
import com.digihome.library.api.database.entity.CategoryRepository
import com.digihome.library.api.models.CategoryCreateRequest
import com.digihome.library.api.models.CategoryResponse
import com.digihome.library.api.models.ServiceResponseModel
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.format.DateTimeFormatter
import java.util.*

@Service
class CategoryDbService(val categoryRepository: CategoryRepository) {
    val logger = LoggerFactory.getLogger(this::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

    fun createCategory(request: CategoryCreateRequest): ServiceResponseModel {
        val existing = categoryRepository.findByName(request.name)
        if (existing != null) {
            throw Exception("Category '${request.name}' already exists")
        }

        val parent = request.parentId?.let {
            categoryRepository.findById(it).orElseThrow { Exception("Parent category not found: $it") }
        }

        val category = CategoryEntity(
            id = UUID.randomUUID().toString(),
            name = request.name,
            parent = parent
        )

        categoryRepository.save(category)
        return ServiceResponseModel(true, "Category created successfully")
    }

    fun listCategories(): List<CategoryResponse> {
        val categories = categoryRepository.findAllByOrderByNameAsc()
        return categories.map { mapToCategoryResponse(it) }
    }

    fun getCategoryById(id: String): CategoryResponse? {
        val category = categoryRepository.findById(id).orElse(null) ?: return null
        return mapToCategoryResponse(category)
    }

    private fun mapToCategoryResponse(category: CategoryEntity): CategoryResponse {
        return CategoryResponse(
            id = category.id,
            name = category.name,
            parentId = category.parent?.id,
            parentName = category.parent?.name,
            createdAt = category.createdAt.format(dateFormatter)
        )
    }
}
```

- [ ] **Step 2: Create CategoryController.kt**

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.CategoryDbService
import com.digihome.library.api.models.CategoryCreateRequest
import com.digihome.library.api.models.CategoryResponse
import com.digihome.library.api.models.ResponseModel
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/categories")
class CategoryController(val categoryDbService: CategoryDbService) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping
    fun createCategory(@RequestBody request: CategoryCreateRequest): ResponseEntity<ResponseModel> {
        logger.info("Create category request: ${request.name}")
        return try {
            val response = categoryDbService.createCategory(request)
            ResponseEntity(response, HttpStatus.CREATED)
        } catch (e: Exception) {
            logger.error("Create category failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping
    fun listCategories(): ResponseEntity<ResponseModel> {
        logger.info("List categories")
        return try {
            val categories = categoryDbService.listCategories()
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), categories), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("List categories failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/{id}")
    fun getCategory(@PathVariable id: String): ResponseEntity<ResponseModel> {
        logger.info("Get category: $id")
        return try {
            val category = categoryDbService.getCategoryById(id)
            if (category != null) {
                ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), category), HttpStatus.OK)
            } else {
                ResponseEntity(
                    ResponseModel(success = false, message = "Category not found", code = HttpStatus.NOT_FOUND.value()),
                    HttpStatus.NOT_FOUND
                )
            }
        } catch (e: Exception) {
            logger.error("Get category failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/dbservice/CategoryDbService.kt \
        api/src/main/kotlin/com/digihome/library/api/controller/CategoryController.kt
git commit -m "feat: add CategoryDbService and CategoryController"
```

---

### Task 7: Security Configuration Update

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt:41-48`

**Interfaces:**
- Consumes: existing security config
- Produces: updated `SecurityFilterChain` with public read access for catalog

- [ ] **Step 1: Update SecurityConfiguration.kt to allow catalog browsing**

The current security config uses `.anyRequest().authenticated()` which means all requests need JWT. For Sprint 2, we need catalog browsing to work for unauthenticated users (members browsing the public catalog). Update the `filterChain` method:

```kotlin
@Bean
fun filterChain(http: HttpSecurity): SecurityFilterChain {
    http
        .cors { }
        .csrf { it.disable() }
        .authorizeHttpRequests { auth ->
            auth
                .requestMatchers(HttpMethod.POST, jwtConfig.url).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // Sprint 2: Allow public catalog browsing
                .requestMatchers(HttpMethod.GET, "/api/books").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/books/{id}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/books/search").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/books/{id}/copies").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/books/{id}/qr").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories/{id}").permitAll()
                .anyRequest().authenticated()
        }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        .addFilter(
            JWTAuthenticationFilter(authenticationManager(null), jwtConfig, objectMapper)
        )
        .addFilter(
            JWTAuthorizationFilter(authenticationManager(null), jwtConfig, objectMapper)
        )

    return http.build()
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt
git commit -m "feat: allow public access for catalog browsing endpoints"
```

---

### Task 8: Frontend Dependencies + Types

**Files:**
- Modify: `frontend/package.json` (add AG Grid)
- Modify: `frontend/src/types/index.ts` (add new types)

**Interfaces:**
- Consumes: existing types
- Produces: AG Grid installed, updated TypeScript types

- [ ] **Step 1: Install AG Grid dependencies**

Run in `frontend/`:
```bash
npm install ag-grid-community @ag-grid-community/react
```

- [ ] **Step 2: Update types/index.ts**

Add the following types after the existing `DashboardStats` interface:

```typescript
// --- Book Management Types ---

export interface BookCreateRequest {
  isbn: string;
  bookName: string;
  author: string;
  publication: string;
  language: string;
  location: string;
  description: string;
  coverImageUrl: string;
  categoryId: string | null;
}

export interface BookUpdateRequest {
  isbn?: string;
  bookName?: string;
  author?: string;
  publication?: string;
  language?: string;
  location?: string;
  description?: string;
  coverImageUrl?: string;
  categoryId?: string;
}

export interface BookSearchParams {
  q?: string;
  categoryId?: string;
  language?: string;
  available?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface BookCopyRequest {
  branchId: string;
  quantity: number;
  barcodes?: string[];
}

export interface BookTransferRequest {
  copyId: string;
  fromBranchId: string;
  toBranchId: string;
}

export interface IsbnLookupResponse {
  isbn: string;
  title: string;
  author: string;
  publication: string;
  language: string;
  coverImageUrl: string;
  description: string;
}

export interface CategoryCreateRequest {
  name: string;
  parentId: string | null;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string | null;
  code: number;
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

Also update the existing `Book` interface to include copy counts:

```typescript
export interface Book {
  id: string;
  isbn: string;
  bookName: string;
  author: string;
  publication: string;
  language: string;
  location: string;
  description: string;
  coverImageUrl: string;
  categoryId: string | null;
  categoryName: string | null;
  availableCopies: number;
  totalCopies: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/types/index.ts
git commit -m "feat: install AG Grid and add book management TypeScript types"
```

---

### Task 9: Book + Category API Services

**Files:**
- Create: `frontend/src/services/bookService.ts`
- Create: `frontend/src/services/categoryService.ts`

**Interfaces:**
- Consumes: `api` (Axios instance), types from Task 8
- Produces: `bookService` and `categoryService` with typed API methods

- [ ] **Step 1: Create bookService.ts**

```typescript
import api from './api';
import type {
  Book,
  BookCreateRequest,
  BookUpdateRequest,
  BookSearchParams,
  BookCopyRequest,
  BookCopyResponse,
  BookTransferRequest,
  IsbnLookupResponse,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const bookService = {
  // Book CRUD
  async createBook(data: BookCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/books', data);
    return response.data;
  },

  async updateBook(id: string, data: BookUpdateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>(`/books/${id}`, data);
    return response.data;
  },

  async getBook(id: string): Promise<ApiResponse<Book>> {
    const response = await api.get<ApiResponse<Book>>(`/books/${id}`);
    return response.data;
  },

  async listBooks(page = 1, size = 20): Promise<PaginatedResponse<Book>> {
    const response = await api.get<PaginatedResponse<Book>>('/books', {
      params: { page, size },
    });
    return response.data;
  },

  async searchBooks(params: BookSearchParams): Promise<PaginatedResponse<Book>> {
    const response = await api.get<PaginatedResponse<Book>>('/books/search', {
      params,
    });
    return response.data;
  },

  // ISBN Lookup
  async lookupIsbn(isbn: string): Promise<ApiResponse<IsbnLookupResponse>> {
    const response = await api.get<ApiResponse<IsbnLookupResponse>>(`/books/isbn/${isbn}`);
    return response.data;
  },

  // Copy Management
  async addCopies(bookId: string, data: BookCopyRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/books/${bookId}/copies`, data);
    return response.data;
  },

  async getCopies(bookId: string): Promise<ApiResponse<BookCopyResponse[]>> {
    const response = await api.get<ApiResponse<BookCopyResponse[]>>(`/books/${bookId}/copies`);
    return response.data;
  },

  async transferCopy(bookId: string, data: BookTransferRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/books/${bookId}/transfer`, data);
    return response.data;
  },

  // QR Code
  async getQrCode(bookId: string): Promise<string> {
    const response = await api.get(`/books/${bookId}/qr`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },
};
```

- [ ] **Step 2: Create categoryService.ts**

```typescript
import api from './api';
import type { Category, CategoryCreateRequest, ApiResponse } from '../types';

export const categoryService = {
  async createCategory(data: CategoryCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/categories', data);
    return response.data;
  },

  async listCategories(): Promise<ApiResponse<Category[]>> {
    const response = await api.get<ApiResponse<Category[]>>('/categories');
    return response.data;
  },

  async getCategory(id: string): Promise<ApiResponse<Category>> {
    const response = await api.get<ApiResponse<Category>>(`/categories/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/bookService.ts frontend/src/services/categoryService.ts
git commit -m "feat: add book and category API services"
```

---

### Task 10: Admin Book List Page (AG Grid)

**Files:**
- Create: `frontend/src/pages/admin/BookListPage.tsx`
- Create: `frontend/src/pages/admin/BookListPage.css`

**Interfaces:**
- Consumes: `bookService`, `categoryService`, `useAuthStore`, AG Grid
- Produces: Admin book list with sorting, filtering, pagination, and action buttons

- [ ] **Step 1: Create BookListPage.tsx**

```tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from '@ag-grid-community/react';
import type { ColDef } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { categoryService } from '../../services/categoryService';
import type { Book, Category } from '../../types';
import './BookListPage.css';

export function BookListPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  });

  const columnDefs: ColDef<Book>[] = useMemo(() => [
    { headerName: 'Title', field: 'bookName', sortable: true, filter: true, flex: 2 },
    { headerName: 'Author', field: 'author', sortable: true, filter: true, flex: 1 },
    { headerName: 'ISBN', field: 'isbn', sortable: true, filter: true, flex: 1 },
    { headerName: 'Category', field: 'categoryName', sortable: true, filter: true, flex: 1 },
    { headerName: 'Language', field: 'language', sortable: true, filter: true, flex: 1 },
    {
      headerName: 'Available',
      field: 'availableCopies',
      sortable: true,
      flex: 1,
      cellRenderer: (params: { data: Book }) => {
        const book = params.data;
        return `${book.availableCopies} / ${book.totalCopies}`;
      },
    },
    {
      headerName: 'Actions',
      flex: 1,
      cellRenderer: (params: { data: Book }) => {
        const book = params.data;
        return `
          <div class="action-buttons">
            <button class="btn-icon" data-action="view" data-id="${book.id}" title="View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="btn-icon" data-action="edit" data-id="${book.id}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        `;
      },
    },
  ], []);

  useEffect(() => {
    loadBooks();
    loadCategories();
  }, [pagination.page]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const response = await bookService.listBooks(pagination.page, pagination.size);
      if (response.success) {
        setBooks(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.total,
          totalPages: response.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoryService.listCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleCellClick = (params: { data?: Book }) => {
    if (params.data) {
      navigate(`/admin/books/${params.data.id}`);
    }
  };

  return (
    <div className="book-list-page">
      <div className="page-header">
        <h1 className="page-title">Books</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/admin/books/new')}
        >
          <Plus size={16} />
          Add Book
        </button>
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact
          rowData={books}
          columnDefs={columnDefs}
          modules={[AllCommunityModule]}
          pagination={true}
          paginationPageSize={pagination.size}
          onCellClicked={handleCellClick}
          loading={loading}
          noRowsOverlay="No books found"
        />
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-secondary"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create BookListPage.css**

```css
.book-list-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header .btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  color: var(--accent);
  background: var(--bg-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/BookListPage.tsx frontend/src/pages/admin/BookListPage.css
git commit -m "feat: add admin book list page with AG Grid"
```

---

### Task 11: Admin Book Form Page (ISBN Lookup)

**Files:**
- Create: `frontend/src/pages/admin/BookFormPage.tsx`
- Create: `frontend/src/pages/admin/BookFormPage.css`

**Interfaces:**
- Consumes: `bookService`, `categoryService`, React Router params
- Produces: Add/Edit book form with ISBN auto-lookup

- [ ] **Step 1: Create BookFormPage.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Save, ArrowLeft } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { categoryService } from '../../services/categoryService';
import type { BookCreateRequest, BookUpdateRequest, Category, IsbnLookupResponse } from '../../types';
import './BookFormPage.css';

export function BookFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<BookCreateRequest>({
    isbn: '',
    bookName: '',
    author: '',
    publication: '',
    language: '',
    location: '',
    description: '',
    coverImageUrl: '',
    categoryId: null,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCategories();
    if (isEdit && id) {
      loadBook(id);
    }
  }, [id, isEdit]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.listCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadBook = async (bookId: string) => {
    setLoading(true);
    try {
      const response = await bookService.getBook(bookId);
      if (response.success && response.data) {
        const book = response.data;
        setFormData({
          isbn: book.isbn,
          bookName: book.bookName,
          author: book.author,
          publication: book.publication,
          language: book.language,
          location: book.location,
          description: book.description,
          coverImageUrl: book.coverImageUrl,
          categoryId: book.categoryId,
        });
      }
    } catch (err) {
      setError('Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const handleIsbnLookup = async () => {
    if (!formData.isbn) return;

    setIsbnLoading(true);
    setError('');
    try {
      const response = await bookService.lookupIsbn(formData.isbn);
      if (response.success && response.data) {
        const isbnData: IsbnLookupResponse = response.data;
        setFormData(prev => ({
          ...prev,
          bookName: isbnData.title || prev.bookName,
          author: isbnData.author || prev.author,
          publication: isbnData.publication || prev.publication,
          language: isbnData.language || prev.language,
          coverImageUrl: isbnData.coverImageUrl || prev.coverImageUrl,
          description: isbnData.description || prev.description,
        }));
        setSuccess('Book details auto-filled from ISBN');
      } else {
        setError('ISBN not found in Open Library');
      }
    } catch (err) {
      setError('ISBN lookup failed');
    } finally {
      setIsbnLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.bookName || !formData.author) {
      setError('Title and author are required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
        const updateData: BookUpdateRequest = { ...formData };
        await bookService.updateBook(id, updateData);
        setSuccess('Book updated successfully');
      } else {
        await bookService.createBook(formData);
        setSuccess('Book created successfully');
        setTimeout(() => navigate('/admin/books'), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="book-form-page">
      <div className="page-header">
        <button className="btn-secondary" onClick={() => navigate('/admin/books')}>
          <ArrowLeft size={16} />
          Back to Books
        </button>
        <h1 className="page-title">{isEdit ? 'Edit Book' : 'Add New Book'}</h1>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleSubmit} className="book-form">
        <div className="form-section">
          <h2>Book Information</h2>

          <div className="isbn-row">
            <div className="form-group flex-1">
              <label htmlFor="isbn">ISBN</label>
              <input
                type="text"
                id="isbn"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                placeholder="Enter ISBN"
              />
            </div>
            <button
              type="button"
              className="btn-secondary isbn-lookup-btn"
              onClick={handleIsbnLookup}
              disabled={isbnLoading || !formData.isbn}
            >
              <Search size={16} />
              {isbnLoading ? 'Looking up...' : 'Lookup ISBN'}
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="bookName">Title *</label>
            <input
              type="text"
              id="bookName"
              name="bookName"
              value={formData.bookName}
              onChange={handleChange}
              required
              placeholder="Book title"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="author">Author *</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleChange}
                required
                placeholder="Author name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="publication">Publication</label>
              <input
                type="text"
                id="publication"
                name="publication"
                value={formData.publication}
                onChange={handleChange}
                placeholder="Publisher name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="language">Language</label>
              <input
                type="text"
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                placeholder="e.g., English"
              />
            </div>
            <div className="form-group">
              <label htmlFor="categoryId">Category</label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId || ''}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Shelf A-12"
            />
          </div>

          <div className="form-group">
            <label htmlFor="coverImageUrl">Cover Image URL</label>
            <input
              type="url"
              id="coverImageUrl"
              name="coverImageUrl"
              value={formData.coverImageUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
            {formData.coverImageUrl && (
              <img
                src={formData.coverImageUrl}
                alt="Cover preview"
                className="cover-preview"
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Book description..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/admin/books')}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving...' : isEdit ? 'Update Book' : 'Create Book'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create BookFormPage.css**

```css
.book-form-page {
  padding: 24px;
  max-width: 800px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header .btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.book-form {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 24px;
}

.form-section h2 {
  font-size: 18px;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.isbn-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.isbn-row .flex-1 {
  flex: 1;
}

.isbn-lookup-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  height: 42px;
}

.cover-preview {
  margin-top: 8px;
  max-width: 120px;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
}

.form-error {
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.form-success {
  padding: 12px;
  background: rgba(34, 197, 94, 0.1);
  color: var(--success);
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.form-actions .btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/BookFormPage.tsx frontend/src/pages/admin/BookFormPage.css
git commit -m "feat: add admin book form page with ISBN auto-lookup"
```

---

### Task 12: Admin Category Management Page

**Files:**
- Create: `frontend/src/pages/admin/CategoryListPage.tsx`
- Create: `frontend/src/pages/admin/CategoryListPage.css`

**Interfaces:**
- Consumes: `categoryService`
- Produces: Category list with create/edit modal

- [ ] **Step 1: Create CategoryListPage.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Plus, Edit, X } from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import type { Category, CategoryCreateRequest } from '../../types';
import './CategoryListPage.css';

export function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryCreateRequest>({
    name: '',
    parentId: null,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await categoryService.listCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', parentId: null });
    setShowModal(true);
    setError('');
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, parentId: category.parentId });
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      await categoryService.createCategory(formData);
      setShowModal(false);
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const rootCategories = categories.filter(c => !c.parentId);
  const childCategories = categories.filter(c => c.parentId);

  return (
    <div className="category-list-page">
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <button className="btn-primary" onClick={handleCreate}>
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading categories...</div>
      ) : (
        <div className="category-grid">
          {rootCategories.map(category => (
            <div key={category.id} className="category-card">
              <div className="category-header">
                <h3>{category.name}</h3>
                <button className="btn-icon" onClick={() => handleEdit(category)}>
                  <Edit size={16} />
                </button>
              </div>
              <div className="category-children">
                {childCategories
                  .filter(c => c.parentId === category.id)
                  .map(child => (
                    <div key={child.id} className="category-child">
                      <span>{child.name}</span>
                      <button className="btn-icon" onClick={() => handleEdit(child)}>
                        <Edit size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {rootCategories.length === 0 && (
            <div className="empty-state">No categories yet. Create one to get started.</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="parentId">Parent Category (optional)</label>
                <select
                  id="parentId"
                  value={formData.parentId || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    parentId: e.target.value || null,
                  }))}
                >
                  <option value="">None (root category)</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CategoryListPage.css**

```css
.category-list-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header .btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.category-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 16px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.category-header h3 {
  font-size: 16px;
  color: var(--text-primary);
}

.category-children {
  padding-left: 16px;
  border-left: 2px solid var(--border-color);
}

.category-child {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary);
  border-radius: var(--radius);
  padding: 24px;
  width: 100%;
  max-width: 480px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/CategoryListPage.tsx frontend/src/pages/admin/CategoryListPage.css
git commit -m "feat: add admin category management page"
```

---

### Task 13: Member Catalog Page (Search + Filters)

**Files:**
- Create: `frontend/src/pages/member/CatalogPage.tsx`
- Create: `frontend/src/pages/member/CatalogPage.css`

**Interfaces:**
- Consumes: `bookService`, `categoryService`
- Produces: Public catalog with search bar, category filter, availability filter

- [ ] **Step 1: Create CatalogPage.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, BookOpen } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { categoryService } from '../../services/categoryService';
import type { Book, Category, BookSearchParams } from '../../types';
import './CatalogPage.css';

export function CatalogPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<BookSearchParams>({
    q: '',
    categoryId: undefined,
    language: undefined,
    available: undefined,
    page: 1,
    size: 12,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [searchParams.page, searchParams.categoryId, searchParams.available]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.listCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadBooks = async () => {
    setLoading(true);
    try {
      const response = await bookService.searchBooks(searchParams);
      if (response.success) {
        setBooks(response.data);
        setPagination({
          page: response.page,
          totalPages: response.totalPages,
          total: response.total,
        });
      }
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => ({ ...prev, page: 1 }));
    loadBooks();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSearchParams(prev => ({
      ...prev,
      categoryId: categoryId || undefined,
      page: 1,
    }));
  };

  const handleAvailabilityToggle = () => {
    setSearchParams(prev => ({
      ...prev,
      available: prev.available === true ? undefined : true,
      page: 1,
    }));
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1 className="page-title">Catalog</h1>
        <p className="catalog-subtitle">{pagination.total} books available</p>
      </div>

      <div className="catalog-filters">
        <form className="search-bar" onSubmit={handleSearch}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={searchParams.q || ''}
            onChange={e => setSearchParams(prev => ({ ...prev, q: e.target.value }))}
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>

        <div className="filter-row">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={searchParams.categoryId || ''}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            className={`filter-toggle ${searchParams.available === true ? 'active' : ''}`}
            onClick={handleAvailabilityToggle}
          >
            Available Now
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading books...</div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <h3>No books found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="book-grid">
            {books.map(book => (
              <div
                key={book.id}
                className="book-card"
                onClick={() => navigate(`/catalog/${book.id}`)}
              >
                <div className="book-cover">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.bookName} />
                  ) : (
                    <div className="cover-placeholder">
                      <BookOpen size={32} />
                    </div>
                  )}
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.bookName}</h3>
                  <p className="book-author">{book.author}</p>
                  {book.categoryName && (
                    <span className="book-category">{book.categoryName}</span>
                  )}
                  <div className="book-availability">
                    <span className={book.availableCopies > 0 ? 'available' : 'unavailable'}>
                      {book.availableCopies > 0
                        ? `${book.availableCopies} available`
                        : 'Not available'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-secondary"
                disabled={pagination.page === 1}
                onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CatalogPage.css**

```css
.catalog-page {
  padding: 24px;
}

.catalog-header {
  margin-bottom: 24px;
}

.catalog-subtitle {
  color: var(--text-secondary);
  margin-top: 4px;
}

.catalog-filters {
  margin-bottom: 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  margin-bottom: 12px;
}

.search-bar input {
  flex: 1;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 16px;
  outline: none;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
}

.filter-group select {
  border: none;
  background: none;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
}

.filter-toggle {
  padding: 8px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-toggle.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.book-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.book-cover {
  height: 200px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  color: var(--text-secondary);
}

.book-info {
  padding: 12px;
}

.book-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-author {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.book-category {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.book-availability {
  font-size: 12px;
}

.book-availability .available {
  color: var(--success);
}

.book-availability .unavailable {
  color: var(--danger);
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
}

.empty-state h3 {
  margin-top: 16px;
  color: var(--text-primary);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/member/CatalogPage.tsx frontend/src/pages/member/CatalogPage.css
git commit -m "feat: add member catalog page with search and filters"
```

---

### Task 14: Member Book Detail Page

**Files:**
- Create: `frontend/src/pages/member/BookDetailPage.tsx`
- Create: `frontend/src/pages/member/BookDetailPage.css`

**Interfaces:**
- Consumes: `bookService`, React Router params
- Produces: Book detail page showing info + availability per branch

- [ ] **Step 1: Create BookDetailPage.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, MapPin, Clock } from 'lucide-react';
import { bookService } from '../../services/bookService';
import type { Book, BookCopyResponse } from '../../types';
import './BookDetailPage.css';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [copies, setCopies] = useState<BookCopyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadBookDetail(id);
    }
  }, [id]);

  const loadBookDetail = async (bookId: string) => {
    setLoading(true);
    try {
      const [bookResponse, copiesResponse] = await Promise.all([
        bookService.getBook(bookId),
        bookService.getCopies(bookId),
      ]);

      if (bookResponse.success && bookResponse.data) {
        setBook(bookResponse.data);
      } else {
        setError('Book not found');
      }

      if (copiesResponse.success && copiesResponse.data) {
        setCopies(copiesResponse.data);
      }
    } catch (err) {
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading book details...</div>;
  }

  if (error || !book) {
    return (
      <div className="error-state">
        <p>{error || 'Book not found'}</p>
        <button className="btn-secondary" onClick={() => navigate('/catalog')}>
          Back to Catalog
        </button>
      </div>
    );
  }

  // Group copies by branch
  const copiesByBranch = copies.reduce((acc, copy) => {
    const branchId = copy.branchId;
    if (!acc[branchId]) {
      acc[branchId] = {
        branchName: copy.branchName,
        total: 0,
        available: 0,
      };
    }
    acc[branchId].total++;
    if (copy.status === 'AVAILABLE') {
      acc[branchId].available++;
    }
    return acc;
  }, {} as Record<string, { branchName: string; total: number; available: number }>);

  return (
    <div className="book-detail-page">
      <button className="btn-secondary back-btn" onClick={() => navigate('/catalog')}>
        <ArrowLeft size={16} />
        Back to Catalog
      </button>

      <div className="book-detail">
        <div className="book-cover-section">
          {book.coverImageUrl ? (
            <img src={book.coverImageUrl} alt={book.bookName} className="book-cover-img" />
          ) : (
            <div className="cover-placeholder-large">
              <BookOpen size={64} />
            </div>
          )}
        </div>

        <div className="book-info-section">
          <h1 className="book-title">{book.bookName}</h1>
          <p className="book-author">by {book.author}</p>

          {book.categoryName && (
            <span className="book-category-badge">{book.categoryName}</span>
          )}

          <div className="book-meta">
            {book.isbn && (
              <div className="meta-item">
                <span className="meta-label">ISBN:</span>
                <span>{book.isbn}</span>
              </div>
            )}
            {book.publication && (
              <div className="meta-item">
                <span className="meta-label">Publisher:</span>
                <span>{book.publication}</span>
              </div>
            )}
            {book.language && (
              <div className="meta-item">
                <span className="meta-label">Language:</span>
                <span>{book.language}</span>
              </div>
            )}
            {book.location && (
              <div className="meta-item">
                <MapPin size={14} />
                <span>{book.location}</span>
              </div>
            )}
          </div>

          {book.description && (
            <div className="book-description">
              <h3>Description</h3>
              <p>{book.description}</p>
            </div>
          )}

          <div className="availability-section">
            <h3>
              <Clock size={16} />
              Availability
            </h3>
            <div className="availability-summary">
              <span className={book.availableCopies > 0 ? 'available' : 'unavailable'}>
                {book.availableCopies} of {book.totalCopies} copies available
              </span>
            </div>

            {Object.keys(copiesByBranch).length > 0 && (
              <div className="branch-availability">
                {Object.entries(copiesByBranch).map(([branchId, info]) => (
                  <div key={branchId} className="branch-row">
                    <span className="branch-name">{info.branchName}</span>
                    <span className="branch-count">
                      {info.available} / {info.total} available
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create BookDetailPage.css**

```css
.book-detail-page {
  padding: 24px;
  max-width: 1000px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.book-detail {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 32px;
}

.book-cover-section {
  position: sticky;
  top: 24px;
}

.book-cover-img {
  width: 100%;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}

.cover-placeholder-large {
  width: 100%;
  height: 400px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.book-info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.book-info-section .book-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.book-info-section .book-author {
  font-size: 18px;
  color: var(--text-secondary);
}

.book-category-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--accent);
  color: white;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  width: fit-content;
}

.book-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.meta-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.book-description h3,
.availability-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.book-description p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.availability-summary {
  margin-bottom: 16px;
}

.availability-summary .available {
  color: var(--success);
  font-weight: 500;
}

.availability-summary .unavailable {
  color: var(--danger);
  font-weight: 500;
}

.branch-availability {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.branch-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
}

.branch-name {
  font-weight: 500;
  color: var(--text-primary);
}

.branch-count {
  color: var(--text-secondary);
  font-size: 14px;
}

.error-state {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
}

.error-state .btn-secondary {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .book-detail {
    grid-template-columns: 1fr;
  }

  .book-cover-section {
    position: static;
    max-width: 300px;
    margin: 0 auto;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/member/BookDetailPage.tsx frontend/src/pages/member/BookDetailPage.css
git commit -m "feat: add member book detail page with availability"
```

---

### Task 15: Routing + Navigation Updates

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: all pages from Tasks 10-14
- Produces: working routes and navigation

- [ ] **Step 1: Update App.tsx with new routes**

Replace the existing routes section in `App.tsx`. Add imports for new pages and the routes:

```tsx
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BookListPage } from './pages/admin/BookListPage';
import { BookFormPage } from './pages/admin/BookFormPage';
import { CategoryListPage } from './pages/admin/CategoryListPage';
import { CatalogPage } from './pages/member/CatalogPage';
import { BookDetailPage } from './pages/member/BookDetailPage';
```

Update the route structure inside the `<Routes>`:

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />

  {/* Admin routes */}
  <Route element={<ProtectedRoute roles={['ADMIN', 'LIBRARIAN']}><Layout /></ProtectedRoute>}>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/admin/books" element={<BookListPage />} />
    <Route path="/admin/books/new" element={<BookFormPage />} />
    <Route path="/admin/books/:id" element={<BookFormPage />} />
    <Route path="/admin/categories" element={<CategoryListPage />} />
  </Route>

  {/* Member routes (also accessible to Admin/Librarian) */}
  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route path="/catalog" element={<CatalogPage />} />
    <Route path="/catalog/:id" element={<BookDetailPage />} />
  </Route>

  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

- [ ] **Step 2: Update Layout.tsx navigation**

Add new navigation items to the sidebar in `Layout.tsx`. Find the nav section and add:

For ADMIN/LIBRARIAN role (add after existing nav items):
```tsx
{hasRole('ADMIN') && (
  <>
    <NavLink to="/admin/books" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
      <BookOpen size={20} />
      <span>Books</span>
    </NavLink>
    <NavLink to="/admin/categories" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
      <BookOpen size={20} />
      <span>Categories</span>
    </NavLink>
  </>
)}
```

For all authenticated users (add after admin nav items):
```tsx
<NavLink to="/catalog" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
  <BookOpen size={20} />
  <span>Catalog</span>
</NavLink>
```

- [ ] **Step 3: Build and verify**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors (only tsconfig deprecation warning).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat: add routing and navigation for book management pages"
```

---

## Verification

After all tasks are complete:

1. **Backend verification** (requires JDK 17 + MySQL):
   ```bash
   cd api && mvn compile
   ```

2. **Frontend verification** (works now):
   ```bash
   cd frontend && npm run build
   ```

3. **Manual E2E flow** (requires backend running):
   - Admin login → /admin/books → Add Book → ISBN lookup → Save
   - Admin → /admin/categories → Create category
   - Member login → /catalog → Search → Filter → View book detail
   - Verify availability shows per-branch counts
