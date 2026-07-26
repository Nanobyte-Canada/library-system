package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.ReservationStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "book_reservation")
class BookReservationEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    var book: BooksEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    var branch: BranchEntity? = null,

    @Enumerated(EnumType.STRING)
    var status: ReservationStatus = ReservationStatus.PENDING,

    var queuePosition: Int = 0,

    @CreationTimestamp
    var reservedAt: LocalDateTime = LocalDateTime.now(),

    var notifiedAt: LocalDateTime? = null,

    var expiresAt: LocalDateTime? = null,

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BookReservationRepository : JpaRepository<BookReservationEntity, String> {
    fun findByBookIdAndStatusOrderByQueuePositionAsc(bookId: String, status: ReservationStatus): List<BookReservationEntity>
    fun findByUserIdAndStatusIn(userId: String, statuses: List<ReservationStatus>): List<BookReservationEntity>
}
