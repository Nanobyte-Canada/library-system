package com.digihome.library.api.security

import com.fasterxml.jackson.databind.annotation.JsonDeserialize
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

class LibraryUserPrincipal(
    val id: String,
    private val _username: String,
    private val _password: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val role: String,
    @JsonDeserialize(contentUsing = SimpleGrantedAuthorityDeserializer::class)
    private val _authorities: Collection<GrantedAuthority>
) : UserDetails {

    override fun getUsername(): String = _username
    override fun getPassword(): String = _password
    override fun getAuthorities(): Collection<GrantedAuthority> = _authorities
    override fun isAccountNonExpired(): Boolean = true
    override fun isAccountNonLocked(): Boolean = true
    override fun isCredentialsNonExpired(): Boolean = true
    override fun isEnabled(): Boolean = true
}
