package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.CopyStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
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
}
