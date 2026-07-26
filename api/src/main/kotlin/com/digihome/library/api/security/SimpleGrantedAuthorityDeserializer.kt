package com.digihome.library.api.security

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.JsonDeserializer
import com.fasterxml.jackson.databind.JsonNode
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.io.IOException

class SimpleGrantedAuthorityDeserializer : JsonDeserializer<SimpleGrantedAuthority>() {
    @Throws(IOException::class)
    override fun deserialize(p: JsonParser, ctxt: DeserializationContext): SimpleGrantedAuthority {
        val tree: JsonNode = p.codec.readTree(p)
        return SimpleGrantedAuthority(tree.get("authority").textValue())
    }
}
