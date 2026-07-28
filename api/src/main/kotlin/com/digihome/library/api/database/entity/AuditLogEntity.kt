package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "audit_log")
class AuditLogEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    var user: UserEntity? = null,

    var action: String = "",

    var entityType: String = "",

    var entityId: String = "",

    @Column(columnDefinition = "JSON")
    var details: String? = null,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now()
)

interface AuditLogRepository : JpaRepository<AuditLogEntity, String> {
    fun findByEntityTypeOrderByCreatedAtDesc(entityType: String): List<AuditLogEntity>
    fun findAllByOrderByCreatedAtDesc(): List<AuditLogEntity>
}
