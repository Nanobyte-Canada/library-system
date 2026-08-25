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
    val objectMapper: ObjectMapper,
    val auditLogDbService: AuditLogDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

    @Value("\${qrcode-url}")
    lateinit var qrCodeApiUrl: String

    // --- Book CRUD ---

    fun createBook(request: BookCreateRequest, actorId: String?): ServiceResponseModel {
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
        auditLogDbService.logAction(
            userId = actorId, action = "BOOK_CREATE", entityType = "BOOK",
            entityId = book.id, details = request.bookName
        )
        return ServiceResponseModel(true, "Book created successfully")
    }

    fun updateBook(bookId: String, request: BookUpdateRequest, actorId: String?): ServiceResponseModel {
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
        auditLogDbService.logAction(
            userId = actorId, action = "BOOK_UPDATE", entityType = "BOOK",
            entityId = bookId, details = request.bookName
        )
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
