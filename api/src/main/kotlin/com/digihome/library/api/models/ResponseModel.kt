package com.digihome.library.api.models

/**
 * Created by saurabhbilakhia on 2021-03-14
 */

open class ResponseModel (
    open val success: Boolean = true,
    open val message: String? = null,
    open val code: Int = 200,
    open val data: Any? = null
)