package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.CategoryDbService
import com.digihome.library.api.models.CategoryCreateRequest
import com.digihome.library.api.models.CategoryResponse
import com.digihome.library.api.models.ResponseModel
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/categories")
class CategoryController(val categoryDbService: CategoryDbService) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping
    fun createCategory(@RequestBody request: CategoryCreateRequest): ResponseEntity<ResponseModel> {
        logger.info("Create category request: ${request.name}")
        return try {
            val response = categoryDbService.createCategory(request)
            ResponseEntity(response, HttpStatus.CREATED)
        } catch (e: Exception) {
            logger.error("Create category failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @GetMapping
    fun listCategories(): ResponseEntity<ResponseModel> {
        logger.info("List categories")
        return try {
            val categories = categoryDbService.listCategories()
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), categories), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("List categories failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @GetMapping("/{id}")
    fun getCategory(@PathVariable id: String): ResponseEntity<ResponseModel> {
        logger.info("Get category: $id")
        return try {
            val category = categoryDbService.getCategoryById(id)
            if (category != null) {
                ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), category), HttpStatus.OK)
            } else {
                ResponseEntity(
                    ResponseModel(success = false, message = "Category not found", code = HttpStatus.NOT_FOUND.value()),
                    HttpStatus.NOT_FOUND
                )
            }
        } catch (e: Exception) {
            logger.error("Get category failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()),
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}
