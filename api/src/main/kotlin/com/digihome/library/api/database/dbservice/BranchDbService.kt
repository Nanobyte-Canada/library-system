package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class BranchDbService(
    val branchRepository: BranchRepository
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    fun getAllBranches(): List<Map<String, Any?>> {
        return branchRepository.findAll().map { branch ->
            mapOf(
                "id" to branch.id,
                "name" to branch.name,
                "address" to branch.address,
                "phone" to branch.phone,
                "email" to branch.email,
                "createdAt" to branch.createdAt.toString()
            )
        }
    }

    fun getBranchById(id: String): Map<String, Any?> {
        val branch = branchRepository.findById(id)
            .orElseThrow { Exception("Branch not found: $id") }
        return mapOf(
            "id" to branch.id,
            "name" to branch.name,
            "address" to branch.address,
            "phone" to branch.phone,
            "email" to branch.email,
            "createdAt" to branch.createdAt.toString()
        )
    }

    fun createBranch(request: BranchCreateRequest): ServiceResponseModel {
        if (branchRepository.findByName(request.name) != null) {
            throw Exception("Branch with name '${request.name}' already exists")
        }
        val branch = BranchEntity(
            id = java.util.UUID.randomUUID().toString(),
            name = request.name,
            address = request.address,
            phone = request.phone,
            email = request.email
        )
        branchRepository.save(branch)
        return ServiceResponseModel(true, "Branch created")
    }

    fun updateBranch(id: String, request: BranchCreateRequest): ServiceResponseModel {
        val branch = branchRepository.findById(id)
            .orElseThrow { Exception("Branch not found: $id") }
        branch.name = request.name
        branch.address = request.address
        branch.phone = request.phone
        branch.email = request.email
        branchRepository.save(branch)
        return ServiceResponseModel(true, "Branch updated")
    }

    fun deleteBranch(id: String): ServiceResponseModel {
        val branch = branchRepository.findById(id)
            .orElseThrow { Exception("Branch not found: $id") }
        branchRepository.delete(branch)
        return ServiceResponseModel(true, "Branch deleted")
    }
}
