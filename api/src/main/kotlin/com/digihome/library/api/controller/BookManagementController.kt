package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.BookManagementDbService
import com.digihome.library.api.models.*
import com.digihome.library.api.service.OpenLibraryService
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/books")
class BookManagementController(
    val bookManagementDbService: BookManagementDbService,
    val openLibraryService: OpenLibraryService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
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
