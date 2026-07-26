package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "login")
class LoginEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    var user: UserEntity? = null,

    var username: String = "",

    var password: String = "",

    var isLocked: Boolean = false,

    var failedAttempts: Int = 0,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface LoginRepository : JpaRepository<LoginEntity, String> {
    fun findByUsername(username: String): LoginEntity?
}
