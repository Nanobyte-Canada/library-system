package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "books")
class BooksEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    var isbn: String = "",

    var bookName: String = "",

    var author: String = "",

    var publication: String = "",

    var language: String = "",

    var location: String = "",

    @Column(columnDefinition = "TEXT")
    var description: String = "",

    var coverImageUrl: String = "",

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    var category: CategoryEntity? = null,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BooksRepository : JpaRepository<BooksEntity, String> {
    fun findAllByOrderByCreatedAtDesc(): List<BooksEntity>?
    fun findByLanguageOrderByBookNameAsc(language: String): List<BooksEntity>?
    fun findByBookNameContainingIgnoreCaseOrAuthorContainingIgnoreCaseOrIsbnContaining(
        bookName: String, author: String, isbn: String
    ): List<BooksEntity>
}
