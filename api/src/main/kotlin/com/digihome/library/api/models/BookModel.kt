package com.digihome.library.api.models

data class AddBookModel(
    var isbn: String = "",
    var bookName: String = "",
    var author: String = "",
    var publication: String = "",
    var language: String = "",
    var location: String = "",
    var description: String = "",
    var coverImageUrl: String = "",
    var categoryId: String? = null
)

data class BookIssueModel(
    var userId: String = "",
    var bookId: String = "",
    var copyId: String = ""
)

data class BookFilterModel(
    var language: String = "",
    var page: Int = 1
)
