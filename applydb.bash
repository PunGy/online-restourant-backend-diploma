source .env

dropdb -U $PGUSER $PGDATABASE
createdb -U $PGUSER -O $PGUSER $PGDATABASE

psql -U $PGUSER $PGDATABASE -f restaurant.sql