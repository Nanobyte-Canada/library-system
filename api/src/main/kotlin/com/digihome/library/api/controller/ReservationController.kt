package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.ReservationDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
class ReservationController(
    val reservationDbService: ReservationDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping("/api/reservations")
    fun reserveBook(@RequestHeader("X-User-Id") userId: String, @RequestBody request: ReserveBookRequest): ResponseEntity<ResponseModel> {
        return try {
            val sr = reservationDbService.reserveBook(userId, request)
            ResponseEntity(ResponseModel(true, sr.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()), HttpStatus.BAD_REQUEST)
        }
    }

    @PostMapping("/api/reservations/{id}/cancel")
    fun cancelReservation(@RequestHeader("X-User-Id") userId: String, @PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val sr = reservationDbService.cancelReservation(userId, CancelReservationRequest(id))
            ResponseEntity(ResponseModel(true, sr.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()), HttpStatus.BAD_REQUEST)
        }
    }

    @GetMapping("/api/reservations/my")
    fun myReservations(@RequestHeader("X-User-Id") userId: String): ResponseEntity<ResponseModel> {
        return try {
            val reservations = reservationDbService.getMyReservations(userId)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), reservations), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @GetMapping("/api/reservations")
    fun allReservations(): ResponseEntity<ResponseModel> {
        return try {
            val reservations = reservationDbService.getAllReservations()
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), reservations), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @PostMapping("/api/reservations/{id}/ready")
    fun markReady(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val sr = reservationDbService.markReady(id)
            ResponseEntity(ResponseModel(true, sr.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()), HttpStatus.BAD_REQUEST)
        }
    }

    @PostMapping("/api/reservations/{id}/fulfill")
    fun fulfillReservation(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val sr = reservationDbService.fulfillReservation(id)
            ResponseEntity(ResponseModel(true, sr.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()), HttpStatus.BAD_REQUEST)
        }
    }
}
