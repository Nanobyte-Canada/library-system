package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "book_issue")
data class BookIssueEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "copy_id", nullable = false)
    var copy: BookCopyEntity? = null,

    @CreationTimestamp
    var issueDate: LocalDateTime = LocalDateTime.now(),

    var dueDate: LocalDateTime = LocalDateTime.now().plusDays(21),

    var returnDate: LocalDateTime? = null,

    var renewed: Boolean = false,

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BookIssueRepository : JpaRepository<BookIssueEntity, String> {
    fun findByUserIdAndReturnDateIsNull(userId: String): List<BookIssueEntity>
    fun findByCopyIdAndReturnDateIsNull(copyId: String): BookIssueEntity?
    fun countByUserIdAndReturnDateIsNull(userId: String): Long
}
