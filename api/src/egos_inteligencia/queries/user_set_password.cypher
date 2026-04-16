MATCH (u:User {email: $email})
SET u.password_hash = $password_hash, u.updated_at = datetime()
RETURN u.id AS id, u.email AS email, toString(u.created_at) AS created_at
