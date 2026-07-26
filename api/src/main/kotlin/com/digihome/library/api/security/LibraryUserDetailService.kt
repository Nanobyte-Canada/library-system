package com.digihome.library.api.security

import com.digihome.library.api.database.entity.LoginRepository
import org.slf4j.LoggerFactory
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class LibraryUserDetailService(val loginRepository: LoginRepository) : UserDetailsService {

    val logger = LoggerFactory.getLogger(this::class.java)

    override fun loadUserByUsername(username: String): UserDetails {
        val login = loginRepository.findByUsername(username)
            ?: run {
                logger.error("Username = $username does not exist in DB")
                throw UsernameNotFoundException("Username = $username does not exist in DB")
            }

        val user = login.user
            ?: throw UsernameNotFoundException("User record not linked for username = $username")

        val authorities = setOf(SimpleGrantedAuthority("ROLE_${user.role.name}"))

        return LibraryUserPrincipal(
            id = user.id,
            _username = login.username,
            _password = login.password,
            firstName = user.firstName,
            lastName = user.lastName,
            email = user.emailId,
            role = user.role.name,
            _authorities = authorities
        )
    }
}
