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
