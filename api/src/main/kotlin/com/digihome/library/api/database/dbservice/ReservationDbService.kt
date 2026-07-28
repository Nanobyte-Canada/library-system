package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.CopyStatus
import com.digihome.library.api.database.enums.ReservationStatus
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class ReservationDbService(
    val bookReservationRepository: BookReservationRepository,
    val booksRepository: BooksRepository,
    val bookCopyRepository: BookCopyRepository,
    val userRepository: UserRepository,
    val branchRepository: BranchRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    fun reserveBook(userId: String, request: ReserveBookRequest): ServiceResponseModel {
        val user = userRepository.findById(userId)
            .orElseThrow { Exception("User not found: $userId") }
        val book = booksRepository.findById(request.bookId)
            .orElseThrow { Exception("Book not found: ${request.bookId}") }
        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { Exception("Branch not found: ${request.branchId}") }

        val existingReservations = bookReservationRepository.findByUserIdAndStatusIn(
            userId, listOf(ReservationStatus.PENDING, ReservationStatus.READY)
        )
        if (existingReservations.any { it.book?.id == request.bookId }) {
            throw Exception("You already have a pending reservation for this book")
        }

        val availableCopies = bookCopyRepository.findAvailableCopiesByBookId(request.bookId)
        if (availableCopies.isNotEmpty()) {
            throw Exception("Copies are available — use checkout instead of reservation")
        }

        val currentCount = bookReservationRepository.countPendingByBookId(request.bookId)
        val nextPosition = (currentCount + 1).toInt()

        val reservation = BookReservationEntity(
            id = java.util.UUID.randomUUID().toString(),
            user = user,
            book = book,
            branch = branch,
            status = ReservationStatus.PENDING,
            queuePosition = nextPosition,
            expiresAt = LocalDateTime.now().plusDays(7)
        )
        bookReservationRepository.save(reservation)
        return ServiceResponseModel(true, "Book reserved. Queue position: $nextPosition")
    }

    fun cancelReservation(userId: String, request: CancelReservationRequest): ServiceResponseModel {
        val reservation = bookReservationRepository.findById(request.reservationId)
            .orElseThrow { Exception("Reservation not found: ${request.reservationId}") }
        if (reservation.user?.id != userId) {
            throw Exception("You can only cancel your own reservations")
        }
        if (reservation.status != ReservationStatus.PENDING && reservation.status != ReservationStatus.READY) {
            throw Exception("Cannot cancel reservation in status: ${reservation.status}")
        }
        reservation.status = ReservationStatus.CANCELLED
        reservation.updatedAt = LocalDateTime.now()
        bookReservationRepository.save(reservation)
        recalculateQueuePositions(reservation.book?.id ?: "")
        return ServiceResponseModel(true, "Reservation cancelled")
    }

    fun getMyReservations(userId: String): List<Map<String, Any?>> {
        val reservations = bookReservationRepository.findByUserIdAndStatusIn(
            userId, listOf(ReservationStatus.PENDING, ReservationStatus.READY, ReservationStatus.FULFILLED)
        )
        return reservations.map { mapToReservationResponse(it) }
    }

    fun getAllReservations(): List<Map<String, Any?>> {
        val pending = bookReservationRepository.findByStatusOrderByReservedAtDesc(ReservationStatus.PENDING)
        val ready = bookReservationRepository.findByStatusOrderByReservedAtDesc(ReservationStatus.READY)
        return (pending + ready).map { mapToReservationResponse(it) }
    }

    fun fulfillReservation(reservationId: String): ServiceResponseModel {
        val reservation = bookReservationRepository.findById(reservationId)
            .orElseThrow { Exception("Reservation not found: $reservationId") }
        if (reservation.status != ReservationStatus.READY) {
            throw Exception("Reservation is not ready for pickup")
        }
        reservation.status = ReservationStatus.FULFILLED
        reservation.updatedAt = LocalDateTime.now()
        bookReservationRepository.save(reservation)
        return ServiceResponseModel(true, "Reservation fulfilled")
    }

    fun markReady(reservationId: String): ServiceResponseModel {
        val reservation = bookReservationRepository.findById(reservationId)
            .orElseThrow { Exception("Reservation not found: $reservationId") }
        if (reservation.status != ReservationStatus.PENDING) {
            throw Exception("Reservation is not in PENDING status")
        }
        reservation.status = ReservationStatus.READY
        reservation.notifiedAt = LocalDateTime.now()
        reservation.expiresAt = LocalDateTime.now().plusDays(3)
        reservation.updatedAt = LocalDateTime.now()
        bookReservationRepository.save(reservation)
        return ServiceResponseModel(true, "Reservation marked as ready for pickup")
    }

    private fun recalculateQueuePositions(bookId: String) {
        val pending = bookReservationRepository.findByBookIdAndStatus(bookId, ReservationStatus.PENDING)
        pending.forEachIndexed { index, reservation ->
            reservation.queuePosition = index + 1
            bookReservationRepository.save(reservation)
        }
    }

    private fun mapToReservationResponse(reservation: BookReservationEntity): Map<String, Any?> {
        return mapOf(
            "id" to reservation.id,
            "userId" to (reservation.user?.id ?: ""),
            "userName" to ("${reservation.user?.firstName ?: ""} ${reservation.user?.lastName ?: ""}".trim()),
            "bookId" to (reservation.book?.id ?: ""),
            "bookName" to (reservation.book?.bookName ?: ""),
            "branchId" to (reservation.branch?.id ?: ""),
            "branchName" to (reservation.branch?.name ?: ""),
            "status" to reservation.status.name,
            "queuePosition" to reservation.queuePosition,
            "reservedAt" to reservation.reservedAt.toString(),
            "notifiedAt" to reservation.notifiedAt?.toString(),
            "expiresAt" to reservation.expiresAt?.toString()
        )
    }
}
