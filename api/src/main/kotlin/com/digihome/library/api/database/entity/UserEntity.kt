package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.MembershipType
import com.digihome.library.api.database.enums.UserRole
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "users")
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
    fun findByMembershipId(membershipId: String): UserEntity?
    fun findByIsActive(isActive: Boolean): List<UserEntity>

    // CAST(...) gives Hibernate an explicit type for every occurrence of the nullable
    // parameters. Without it PostgreSQL binds the context-free occurrences (inside
    // CONCAT) as bytea and the query fails at runtime (same issue as books search).
    @Query("SELECT u FROM UserEntity u WHERE " +
           "(CAST(:q AS string) IS NULL OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
           "OR LOWER(u.emailId) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
           "OR LOWER(u.membershipId) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))) " +
           "AND (CAST(:role AS string) IS NULL OR u.role = :role) " +
           "AND (CAST(:branchId AS string) IS NULL OR u.branch.id = :branchId) " +
           "AND (CAST(:isActive AS boolean) IS NULL OR u.isActive = :isActive) " +
           "ORDER BY u.createdAt DESC")
    fun searchUsers(
        @Param("q") q: String?,
        @Param("role") role: com.digihome.library.api.database.enums.UserRole?,
        @Param("branchId") branchId: String?,
        @Param("isActive") isActive: Boolean?,
        pageable: org.springframework.data.domain.Pageable
    ): org.springframework.data.domain.Page<UserEntity>
}
