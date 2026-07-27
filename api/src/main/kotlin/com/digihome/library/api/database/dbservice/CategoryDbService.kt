package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.CategoryEntity
import com.digihome.library.api.database.entity.CategoryRepository
import com.digihome.library.api.models.CategoryCreateRequest
import com.digihome.library.api.models.CategoryResponse
import com.digihome.library.api.models.ServiceResponseModel
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.format.DateTimeFormatter
import java.util.*

@Service
class CategoryDbService(val categoryRepository: CategoryRepository) {
    val logger = LoggerFactory.getLogger(this::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

    fun createCategory(request: CategoryCreateRequest): ServiceResponseModel {
        val existing = categoryRepository.findByName(request.name)
        if (existing != null) {
            throw Exception("Category '${request.name}' already exists")
        }

        val parent = request.parentId?.let {
            categoryRepository.findById(it).orElseThrow { Exception("Parent category not found: $it") }
        }

        val category = CategoryEntity(
            id = UUID.randomUUID().toString(),
            name = request.name,
            parent = parent
        )

        categoryRepository.save(category)
        return ServiceResponseModel(true, "Category created successfully")
    }

    fun listCategories(): List<CategoryResponse> {
        val categories = categoryRepository.findAllByOrderByNameAsc()
        return categories.map { mapToCategoryResponse(it) }
    }

    fun getCategoryById(id: String): CategoryResponse? {
        val category = categoryRepository.findById(id).orElse(null) ?: return null
        return mapToCategoryResponse(category)
    }

    private fun mapToCategoryResponse(category: CategoryEntity): CategoryResponse {
        return CategoryResponse(
            id = category.id,
            name = category.name,
            parentId = category.parent?.id,
            parentName = category.parent?.name,
            createdAt = category.createdAt.format(dateFormatter)
        )
    }
}
