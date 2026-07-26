package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "branch")
class BranchEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    var name: String = "",

    var address: String = "",

    var phone: String = "",

    var email: String = "",

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BranchRepository : JpaRepository<BranchEntity, String>
