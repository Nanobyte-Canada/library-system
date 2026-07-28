package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class AuditLogDbService(
    val auditLogRepository: AuditLogRepository,
    val userRepository: UserRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    fun logAction(userId: String?, action: String, entityType: String, entityId: String, details: String? = null) {
        val user = userId?.let { userRepository.findById(it).orElse(null) }
        val log = AuditLogEntity(
            id = java.util.UUID.randomUUID().toString(),
            user = user,
            action = action,
            entityType = entityType,
            entityId = entityId,
            details = details
        )
        auditLogRepository.save(log)
    }

    fun getAuditLogs(entityType: String? = null, limit: Int = 100): List<Map<String, Any?>> {
        val logs = if (entityType != null) {
            auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType)
        } else {
            auditLogRepository.findAllByOrderByCreatedAtDesc()
        }
        return logs.take(limit).map { log ->
            mapOf(
                "id" to log.id,
                "userId" to (log.user?.id ?: ""),
                "userName" to ("${log.user?.firstName ?: ""} ${log.user?.lastName ?: ""}".trim()),
                "action" to log.action,
                "entityType" to log.entityType,
                "entityId" to log.entityId,
                "details" to log.details,
                "createdAt" to log.createdAt.toString()
            )
        }
    }
}
