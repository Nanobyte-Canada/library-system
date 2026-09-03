package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
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

    // Sprint 2 methods
    fun findByCategoryIdOrderByBookNameAsc(categoryId: String): List<BooksEntity>
    fun findByLanguageContainingIgnoreCaseOrderByBookNameAsc(language: String): List<BooksEntity>

    // CAST(...) IS NULL gives Hibernate an explicit type for the nullable parameters;
    // without it PostgreSQL binds them as bytea and the query fails with
    // "function lower(bytea) does not exist" (Hibernate 6 untyped-param inference).
    @Query("SELECT b FROM BooksEntity b WHERE " +
           "(CAST(:q AS string) IS NULL OR LOWER(b.bookName) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(b.author) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(b.isbn) LIKE LOWER(CONCAT('%',:q,'%'))) " +
           "AND (CAST(:categoryId AS string) IS NULL OR b.category.id = :categoryId) " +
           "AND (CAST(:language AS string) IS NULL OR LOWER(b.language) LIKE LOWER(CONCAT('%',:language,'%'))) " +
           "ORDER BY b.createdAt DESC")
    fun searchBooks(
        @Param("q") q: String?,
        @Param("categoryId") categoryId: String?,
        @Param("language") language: String?,
        pageable: Pageable
    ): Page<BooksEntity>
}
