source .env

dropdb $PGDATABASE
createdb $PGDATABASE

psql -U $PGUSER $PGDATABASE -f restaurant.sql