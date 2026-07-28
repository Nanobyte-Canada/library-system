package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.BranchDbService
import com.digihome.library.api.models.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
class BranchController(
    val branchDbService: BranchDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @GetMapping("/api/branches")
    fun getAllBranches(): ResponseEntity<ResponseModel> {
        return try {
            val branches = branchDbService.getAllBranches()
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), branches), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.INTERNAL_SERVER_ERROR.value()), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @GetMapping("/api/branches/{id}")
    fun getBranchById(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val branch = branchDbService.getBranchById(id)
            ResponseEntity(ResponseModel(true, null, HttpStatus.OK.value(), branch), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.NOT_FOUND.value()), HttpStatus.NOT_FOUND)
        }
    }

    @PostMapping("/api/branches")
    fun createBranch(@RequestBody request: BranchCreateRequest): ResponseEntity<ResponseModel> {
        return try {
            val sr = branchDbService.createBranch(request)
            ResponseEntity(ResponseModel(true, sr.message, HttpStatus.CREATED.value()), HttpStatus.CREATED)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()), HttpStatus.BAD_REQUEST)
        }
    }

    @PutMapping("/api/branches/{id}")
    fun updateBranch(@PathVariable id: String, @RequestBody request: BranchCreateRequest): ResponseEntity<ResponseModel> {
        return try {
            val sr = branchDbService.updateBranch(id, request)
            ResponseEntity(ResponseModel(true, sr.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()), HttpStatus.BAD_REQUEST)
        }
    }

    @DeleteMapping("/api/branches/{id}")
    fun deleteBranch(@PathVariable id: String): ResponseEntity<ResponseModel> {
        return try {
            val sr = branchDbService.deleteBranch(id)
            ResponseEntity(ResponseModel(true, sr.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()), HttpStatus.BAD_REQUEST)
        }
    }
}
