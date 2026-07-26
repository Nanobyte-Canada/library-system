package com.digihome.library.api.models

data class AddUserModel(
    var membershipId: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var phoneNumber: String = "",
    var emailId: String = "",
    var role: String = "MEMBER",
    var membershipType: String = "PUBLIC",
    var branchId: String? = null
)
