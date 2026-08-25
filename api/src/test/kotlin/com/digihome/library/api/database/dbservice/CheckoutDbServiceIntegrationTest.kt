package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.CopyStatus
import com.digihome.library.api.database.enums.ReservationStatus
import com.digihome.library.api.models.CheckoutRequest
import com.digihome.library.api.models.LoginModel
import com.digihome.library.api.models.RenewRequest
import com.digihome.library.api.models.ReturnRequest
import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.*
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import java.time.LocalDateTime

class CheckoutDbServiceIntegrationTest : AbstractIntegrationTest() {

    @Autowired lateinit var checkoutDbService: CheckoutDbService
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var branchRepository: BranchRepository
    @Autowired lateinit var booksRepository: BooksRepository
    @Autowired lateinit var bookCopyRepository: BookCopyRepository
    @Autowired lateinit var bookIssueRepository: BookIssueRepository
    @Autowired lateinit var bookReservationRepository: BookReservationRepository
    @Autowired lateinit var passwordEncoder: BCryptPasswordEncoder
    @Autowired lateinit var loginRepository: LoginRepository
    @Autowired lateinit var restTemplate: TestRestTemplate

    private fun newUser(suffix: String): UserEntity =
        userRepository.save(
            UserEntity(
                firstName = "Test", lastName = suffix, phoneNumber = "555-$suffix",
                emailId = "$suffix@test.com"
            )
        )

    private fun newCopy(suffix: String, status: CopyStatus = CopyStatus.AVAILABLE): BookCopyEntity {
        val branch = branchRepository.save(
            BranchEntity(name = "Branch-$suffix", address = "addr", phone = "555", email = "b$suffix@t.com")
        )
        val book = booksRepository.save(
            BooksEntity(bookName = "Book-$suffix", author = "Author", isbn = "isbn-$suffix")
        )
        return bookCopyRepository.save(
            BookCopyEntity(book = book, branch = branch, barcode = "BC-$suffix", status = status)
        )
    }

    private fun loginAs(user: UserEntity, username: String, password: String): String {
        loginRepository.save(
            LoginEntity(user = user, username = username, password = passwordEncoder.encode(password))
        )
        val response = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/login",
            HttpEntity(LoginModel(username, password)),
            String::class.java
        )
        return response.headers.getFirst("Authorization")!!
    }

    @Test
    fun `checkout creates issue due in 21 days and marks copy LOANED`() {
        val user = newUser("cap-a")
        val copy = newCopy("cap-a")

        val before = LocalDateTime.now().minusSeconds(1)
        val response = checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))

        assertTrue(response.success)
        val issue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(copy.id)!!
        assertTrue(issue.dueDate.isAfter(before.plusDays(20)))
        assertTrue(issue.dueDate.isBefore(before.plusDays(22)))
        assertEquals(CopyStatus.LOANED, bookCopyRepository.findById(copy.id).get().status)
    }

    @Test
    fun `fourth concurrent checkout exceeds limit of 3`() {
        val user = newUser("limit")
        val copies = (1..4).map { newCopy("limit-$it") }
        copies.take(3).forEach {
            checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = it.id))
        }

        val ex = assertThrows<Exception> {
            checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copies[3].id))
        }
        assertTrue(ex.message!!.contains("Borrowing limit"))
    }

    @Test
    fun `cannot checkout a copy that is not AVAILABLE`() {
        val user = newUser("unavail")
        val copy = newCopy("unavail", CopyStatus.LOANED)

        val ex = assertThrows<Exception> {
            checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))
        }
        assertTrue(ex.message!!.contains("not available"))
    }

    @Test
    fun `same copy cannot be checked out twice`() {
        val userA = newUser("dbl-a")
        val userB = newUser("dbl-b")
        val copy = newCopy("dbl")

        checkoutDbService.checkout(CheckoutRequest(userId = userA.id, copyId = copy.id))

        val ex = assertThrows<Exception> {
            checkoutDbService.checkout(CheckoutRequest(userId = userB.id, copyId = copy.id))
        }
        assertTrue(ex.message!!.contains("already checked out"))
    }

    @Test
    fun `return frees the copy`() {
        val user = newUser("ret")
        val copy = newCopy("ret")
        checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))

        val response = checkoutDbService.returnBook(ReturnRequest(copyId = copy.id))

        assertTrue(response.success)
        assertEquals(CopyStatus.AVAILABLE, bookCopyRepository.findById(copy.id).get().status)
    }

    @Test
    fun `renew extends due date by 21 days exactly once`() {
        val user = newUser("ren")
        val copy = newCopy("ren")
        checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))
        val issue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(copy.id)!!

        checkoutDbService.renewIssue(RenewRequest(issueId = issue.id), user.id, callerIsStaff = false)

        val renewed = bookIssueRepository.findById(issue.id).get()
        assertTrue(renewed.renewed)
        assertEquals(issue.dueDate.plusDays(21), renewed.dueDate)

        val ex = assertThrows<Exception> {
            checkoutDbService.renewIssue(RenewRequest(issueId = issue.id), user.id, callerIsStaff = false)
        }
        assertTrue(ex.message!!.contains("already been renewed"))
    }

    @Test
    fun `renew blocked when pending reservation exists`() {
        val user = newUser("resv")
        val copy = newCopy("resv")
        checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))
        val issue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(copy.id)!!
        val reserver = newUser("resv-other")
        bookReservationRepository.save(
            BookReservationEntity(
                user = reserver, book = copy.book!!, branch = copy.branch!!,
                status = ReservationStatus.PENDING, queuePosition = 1
            )
        )

        val ex = assertThrows<Exception> {
            checkoutDbService.renewIssue(RenewRequest(issueId = issue.id), user.id, callerIsStaff = false)
        }
        assertTrue(ex.message!!.contains("pending reservations"))
    }

    @Test
    fun `scan checkout works with bearer token alone - no X-User-Id header`() {
        val user = newUser("scan")
        val copy = newCopy("scan")
        val token = loginAs(user, "scan-user", "password1")

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set(HttpHeaders.AUTHORIZATION, "Bearer ${token.removePrefix("Bearer ")}")
        }
        val response = restTemplate.postForEntity(
            "http://localhost:$port/api/checkout/scan",
            HttpEntity(mapOf("barcode" to copy.barcode), headers),
            String::class.java
        )

        assertEquals(HttpStatus.OK, response.statusCode)
    }
}
