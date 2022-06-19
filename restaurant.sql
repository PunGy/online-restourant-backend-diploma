CREATE TABLE images (
    id CHAR(36),
    type VARCHAR(10),
    title VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY,
    email VARCHAR(255),
    full_name VARCHAR(255),
    password VARCHAR(255),
    role VARCHAR(255),
    PRIMARY KEY (id)
);

CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY,
    customer_id INT,
    products JSONB,
    status VARCHAR(40),
    PRIMARY KEY (id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

CREATE TABLE products (
    id INT GENERATED ALWAYS AS IDENTITY,
    title VARCHAR(255),
    description VARCHAR(255),
    price INT,
    image CHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY (image) REFERENCES images(id)
);

CREATE TABLE sessions (
    id CHAR(36),
    data TEXT,
    PRIMARY KEY (id)
);
