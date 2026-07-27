package com.digihome.library.api.service

import com.digihome.library.api.models.IsbnLookupResponse
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class OpenLibraryService(
    val restTemplate: RestTemplate,
    val objectMapper: ObjectMapper
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    private val baseUrl = "https://openlibrary.org"

    fun lookupIsbn(isbn: String): IsbnLookupResponse? {
        return try {
            val url = "$baseUrl/isbn/$isbn.json"
            val response = restTemplate.getForObject(url, String::class.java) ?: return null

            val json = objectMapper.readTree(response)

            val title = json.path("title").asText("")
            val authors = extractAuthors(json)
            val publishers = extractPublishers(json)
            val cover = extractCover(json, isbn)
            val description = extractDescription(json)

            IsbnLookupResponse(
                isbn = isbn,
                title = title,
                author = authors,
                publication = publishers,
                language = "English",
                coverImageUrl = cover,
                description = description
            )
        } catch (e: Exception) {
            logger.warn("ISBN lookup failed for $isbn: ${e.message}")
            null
        }
    }

    private fun extractAuthors(json: JsonNode): String {
        val authorKeys = json.path("authors")
        if (!authorKeys.isArray || authorKeys.size() == 0) return ""

        return authorKeys.map { authorRef ->
            val authorKey = authorRef.path("key").asText()
            if (authorKey.isNotEmpty()) {
                try {
                    val authorJson = restTemplate.getForObject("$baseUrl$authorKey.json", String::class.java)
                    authorJson?.let { objectMapper.readTree(it).path("name").asText("") } ?: ""
                } catch (e: Exception) {
                    ""
                }
            } else ""
        }.filter { it.isNotEmpty() }.joinToString(", ")
    }

    private fun extractPublishers(json: JsonNode): String {
        val publishers = json.path("publishers")
        return if (publishers.isArray) {
            publishers.map { it.asText() }.filter { it.isNotEmpty() }.joinToString(", ")
        } else {
            json.path("publisher").asText("")
        }
    }

    private fun extractCover(json: JsonNode, isbn: String): String {
        val cover = json.path("cover")
        return if (cover.isObject) {
            cover.path("large").asText("")
                .ifEmpty { cover.path("medium").asText("") }
                .ifEmpty { cover.path("small").asText("") }
        } else {
            "https://covers.openlibrary.org/b/isbn/$isbn-L.jpg"
        }
    }

    private fun extractDescription(json: JsonNode): String {
        val desc = json.path("description")
        return when {
            desc.isTextual -> desc.asText()
            desc.isObject -> desc.path("value").asText()
            else -> ""
        }
    }
}
