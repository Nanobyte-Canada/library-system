package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "email_log")
class EmailLogEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null,

    var emailType: String = "",

    var subject: String = "",

    @CreationTimestamp
    var sentAt: LocalDateTime = LocalDateTime.now(),

    var status: String = "SENT",

    @Column(columnDefinition = "TEXT")
    var errorMessage: String? = null
)

interface EmailLogRepository : JpaRepository<EmailLogEntity, String>
