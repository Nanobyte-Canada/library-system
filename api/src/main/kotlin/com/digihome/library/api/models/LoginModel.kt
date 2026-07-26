package com.digihome.library.api.models

data class LoginModel(
    val username: String = "",
    val password: String = ""
)

data class LoginResponseModel(
    val id: String = "",
    val firstName: String? = null,
    val lastName: String? = null,
    val role: String? = null,
    val email: String? = null
)
