package com.digihome.library.api.models

data class CheckoutRequest(
    var userId: String = "",
    var copyId: String = ""
)

data class ReturnRequest(
    var copyId: String = ""
)

data class ScanCheckoutRequest(
    var barcode: String = ""
)

data class ScanReturnRequest(
    var barcode: String = ""
)

data class RenewRequest(
    var issueId: String = ""
)
