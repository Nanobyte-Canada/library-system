package com.digihome.library.api.models

data class RegisterRequest(
    var firstName: String = "",
    var lastName: String = "",
    var email: String = "",
    var password: String = "",
    var phoneNumber: String = "",
    var membershipId: String = ""
)
