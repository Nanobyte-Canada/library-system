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
    val branchRepository: BranchRepository,
    val bookReservationRepository: BookReservationRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")
    private val MAX_BOOKS_PER_MEMBER = 3
    private val LOAN_PERIOD_DAYS = 21L

    fun checkout(request: CheckoutRequest): ServiceResponseModel {
        val user = userRepository.findById(request.userId)
            .orElseThrow { Exception("User not found: ${request.userId}") }

        val copy = bookCopyRepository.findById(request.copyId)
            .orElseThrow { Exception("Copy not found: ${request.copyId}") }

        if (copy.status != CopyStatus.AVAILABLE) {
            throw Exception("Copy is not available. Current status: ${copy.status}")
        }

        val currentCheckouts = bookIssueRepository.countByUserIdAndReturnDateIsNull(request.userId)
        if (currentCheckouts >= MAX_BOOKS_PER_MEMBER) {
            throw Exception("Borrowing limit reached. Maximum $MAX_BOOKS_PER_MEMBER books allowed.")
        }

        val existingIssue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(request.copyId)
        if (existingIssue != null) {
            throw Exception("This copy is already checked out")
        }

        val now = LocalDateTime.now()
        val issue = BookIssueEntity(
            id = java.util.UUID.randomUUID().toString(),
            user = user,
            copy = copy,
            issueDate = now,
            dueDate = now.plusDays(LOAN_PERIOD_DAYS)
        )
        bookIssueRepository.save(issue)

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

        val now = LocalDateTime.now()
        issue.returnDate = now
        bookIssueRepository.save(issue)

        copy.status = CopyStatus.AVAILABLE
        copy.updatedAt = now
        bookCopyRepository.save(copy)

        return ServiceResponseModel(true, "Book returned successfully")
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

        val book = issue.copy?.book
        if (book != null) {
            val pendingReservations = bookReservationRepository.findByBookIdAndStatusOrderByQueuePositionAsc(
                book.id, com.digihome.library.api.database.enums.ReservationStatus.PENDING
            )
            if (pendingReservations.isNotEmpty()) {
                throw Exception("Cannot renew: there are pending reservations for this book")
            }
        }

        issue.dueDate = issue.dueDate.plusDays(LOAN_PERIOD_DAYS)
        issue.renewed = true
        issue.updatedAt = LocalDateTime.now()
        bookIssueRepository.save(issue)

        return ServiceResponseModel(true, "Book renewed. New due date: ${issue.dueDate.format(dateFormatter)}")
    }

    fun getMyCheckouts(userId: String): List<Map<String, Any?>> {
        val issues = bookIssueRepository.findAllByUserIdOrderByIssueDateDesc(userId)
        return issues.map { mapToCheckoutResponse(it) }
    }

    fun getActiveCheckouts(userId: String): List<Map<String, Any?>> {
        val issues = bookIssueRepository.findByUserIdAndReturnDateIsNull(userId)
        return issues.map { mapToCheckoutResponse(it) }
    }

    private fun mapToCheckoutResponse(issue: BookIssueEntity): Map<String, Any?> {
        return mapOf(
            "id" to issue.id,
            "userId" to (issue.user?.id ?: ""),
            "userName" to ("${issue.user?.firstName ?: ""} ${issue.user?.lastName ?: ""}".trim()),
            "copyId" to (issue.copy?.id ?: ""),
            "bookId" to (issue.copy?.book?.id ?: ""),
            "bookName" to (issue.copy?.book?.bookName ?: ""),
            "barcode" to (issue.copy?.barcode ?: ""),
            "branchName" to (issue.copy?.branch?.name ?: ""),
            "issueDate" to issue.issueDate.format(dateFormatter),
            "dueDate" to issue.dueDate.format(dateFormatter),
            "returnDate" to issue.returnDate?.format(dateFormatter),
            "renewed" to issue.renewed
        )
    }
}
