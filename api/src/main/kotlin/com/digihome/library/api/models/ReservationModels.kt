package com.digihome.library.api.models

data class ReserveBookRequest(
    var bookId: String = "",
    var branchId: String = ""
)

data class CancelReservationRequest(
    var reservationId: String = ""
)
