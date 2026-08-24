package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.CopyStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "book_copies")
class BookCopyEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    var book: BooksEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    var branch: BranchEntity? = null,

    var barcode: String = "",

    @Enumerated(EnumType.STRING)
    var status: CopyStatus = CopyStatus.AVAILABLE,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

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
