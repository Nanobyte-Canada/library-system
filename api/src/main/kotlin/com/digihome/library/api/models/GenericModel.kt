package com.digihome.library.api.models

/**
 * Created by saurabhbilakhia on 2021-03-14
 */

data class ServiceResponseModel (
    override val success: Boolean,
    override val message: String,
    override val data: Any? = null
) : ResponseModel(success = success, message = message, data = data)