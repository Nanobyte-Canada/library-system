package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.AuditLogDbService
import com.digihome.library.api.models.ResponseModel
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
class AuditLogController(
    val auditLogDbService: AuditLogDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @GetMapping("/api/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAuditLogs(
        @RequestParam(required = false) entityType: String?,
        @RequestParam(defaultValue = "100") limit: Int
    ): ResponseEntity<ResponseModel> {
        return try {
            val logs = auditLogDbService.getAuditLogs(entityType, limit)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), logs), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
