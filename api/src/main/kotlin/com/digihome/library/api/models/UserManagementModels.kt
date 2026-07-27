package com.digihome.library.api.models

import com.digihome.library.api.database.enums.MembershipType
import com.digihome.library.api.database.enums.UserRole

data class UserCreateRequest(
    var membershipId: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var phoneNumber: String = "",
    var emailId: String = "",
    var role: UserRole = UserRole.MEMBER,
    var membershipType: MembershipType = MembershipType.PUBLIC,
    var branchId: String? = null,
    var password: String = ""
)

data class UserUpdateRequest(
    var firstName: String? = null,
    var lastName: String? = null,
    var phoneNumber: String? = null,
    var emailId: String? = null,
    var role: UserRole? = null,
    var membershipType: MembershipType? = null,
    var branchId: String? = null,
    var isActive: Boolean? = null
)

data class UserResponse(
    var id: String = "",
    var membershipId: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var phoneNumber: String = "",
    var emailId: String = "",
    var role: UserRole = UserRole.MEMBER,
    var membershipType: MembershipType = MembershipType.PUBLIC,
    var branchId: String? = null,
    var branchName: String? = null,
    var isActive: Boolean = true,
    var createdAt: String = "",
    var updatedAt: String = ""
)

data class PasswordChangeRequest(
    var currentPassword: String = "",
    var newPassword: String = ""
)

data class UserSearchParams(
    var q: String? = null,
    var role: UserRole? = null,
    var branchId: String? = null,
    var isActive: Boolean? = null,
    var page: Int = 1,
    var size: Int = 20
)
