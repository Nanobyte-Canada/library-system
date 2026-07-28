package com.digihome.library.api.models

data class BranchCreateRequest(
    var name: String = "",
    var address: String = "",
    var phone: String = "",
    var email: String = ""
)
