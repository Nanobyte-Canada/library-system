package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.MembershipType
import com.digihome.library.api.database.enums.UserRole
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "user")
class UserEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    var membershipId: String = "",

    var firstName: String = "",

    var lastName: String = "",

    var phoneNumber: String = "",

    var emailId: String = "",

    @Enumerated(EnumType.STRING)
    var role: UserRole = UserRole.MEMBER,

    @Enumerated(EnumType.STRING)
    var membershipType: MembershipType = MembershipType.PUBLIC,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    var branch: BranchEntity? = null,

    var isActive: Boolean = true,

    var createdBy: String = "",

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface UserRepository : JpaRepository<UserEntity, String> {
    fun findByPhoneNumber(phoneNumber: String): UserEntity?
    fun findByEmailId(emailId: String): UserEntity?
    fun findByRole(role: com.digihome.library.api.database.enums.UserRole): List<UserEntity>
}
