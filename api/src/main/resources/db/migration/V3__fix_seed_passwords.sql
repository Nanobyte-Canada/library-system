-- Fix seed user passwords: the V2 seed data used a placeholder BCrypt hash that does
-- not correspond to 'password123' (login always failed password verification — see
-- ADR-0009). V2 cannot be edited (Flyway checksum), so reset the three seed accounts
-- here with a BCrypt(9) hash of 'password123'.
UPDATE login
SET password = '$2a$09$xWBuERt8FjsvTHtKSZSoVedp2ZtjTZw/TTORdmPVuUYUFPwxFgJuu'
WHERE username IN ('admin', 'jane', 'john');
