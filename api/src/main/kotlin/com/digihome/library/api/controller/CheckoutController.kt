package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.CheckoutDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
class CheckoutController(
    val checkoutDbService: CheckoutDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping("/api/checkout")
    fun checkout(@RequestBody request: CheckoutRequest): ResponseEntity<ResponseModel> {
        logger.info("Checkout request: user=${request.userId}, copy=${request.copyId}")
        return try {
            val serviceResponse = checkoutDbService.checkout(request)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Checkout failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/return")
    fun returnBook(@RequestBody request: ReturnRequest): ResponseEntity<ResponseModel> {
        logger.info("Return request: copy=${request.copyId}")
        return try {
            val serviceResponse = checkoutDbService.returnBook(request)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Return failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/checkout/scan")
    fun scanCheckout(
        @RequestHeader("X-User-Id") userId: String,
        @RequestBody request: ScanCheckoutRequest
    ): ResponseEntity<ResponseModel> {
        logger.info("Scan checkout: barcode=${request.barcode}")
        return try {
            val serviceResponse = checkoutDbService.scanCheckoutForUser(userId, request.barcode)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Scan checkout failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/return/scan")
    fun scanReturn(@RequestBody request: ScanReturnRequest): ResponseEntity<ResponseModel> {
        logger.info("Scan return: barcode=${request.barcode}")
        return try {
            val serviceResponse = checkoutDbService.scanReturn(request)
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Scan return failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @PostMapping("/api/checkout/{id}/renew")
    fun renewIssue(@PathVariable id: String, authentication: Authentication): ResponseEntity<ResponseModel> {
        logger.info("Renew request: issue=$id")
        return try {
            val callerIsStaff = authentication.authorities.any {
                it.authority == "ROLE_ADMIN" || it.authority == "ROLE_LIBRARIAN"
            }
            val serviceResponse = checkoutDbService.renewIssue(
                RenewRequest(issueId = id),
                authentication.principal as String,
                callerIsStaff
            )
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Renew failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping("/api/checkout/my")
    fun myCheckouts(@RequestHeader("X-User-Id") userId: String): ResponseEntity<ResponseModel> {
        logger.info("My checkouts: user=$userId")
        return try {
            val checkouts = checkoutDbService.getActiveCheckouts(userId)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), checkouts), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Get checkouts failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/api/checkout/history")
    fun checkoutHistory(
        @RequestHeader("X-User-Id") userId: String
    ): ResponseEntity<ResponseModel> {
        logger.info("Checkout history: user=$userId")
        return try {
            val checkouts = checkoutDbService.getMyCheckouts(userId)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), checkouts), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Get history failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}
