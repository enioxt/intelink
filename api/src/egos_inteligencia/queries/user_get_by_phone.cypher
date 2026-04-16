MATCH (u:User {phone: $phone})
RETURN u.id AS id, u.email AS email, toString(u.created_at) AS created_at
