#!/bin/bash

TABLE1="$1"
TABLE2="$2"
DB_NAME="$3"

# Connect to MySQL and add missing columns
mysql --login-path=bnspmsh "$DB_NAME" <<EOF
SET FOREIGN_KEY_CHECKS=0;

DROP PROCEDURE IF EXISTS AddMissingColumns;

DELIMITER //

CREATE PROCEDURE AddMissingColumns()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE col_name VARCHAR(255);
    DECLARE col_type VARCHAR(255);
    DECLARE cur CURSOR FOR
        SELECT
            sc.COLUMN_NAME,
            sc.COLUMN_TYPE
        FROM
            INFORMATION_SCHEMA.COLUMNS sc
        WHERE
            sc.TABLE_NAME = '$TABLE2'
            AND sc.COLUMN_NAME NOT IN (
                SELECT tf.COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS tf
                WHERE tf.TABLE_NAME = '$TABLE1'
            );

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO col_name, col_type;

        IF done THEN
            LEAVE read_loop;
        END IF;

        SET @alter_sql = CONCAT('ALTER TABLE $TABLE1 ADD COLUMN ', col_name, ' ', col_type);
        PREPARE stmt FROM @alter_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;

    CLOSE cur;
END //

DELIMITER ;

CALL AddMissingColumns();

# Get list of columns from TABLE2 to do insertion
SELECT GROUP_CONCAT(COLUMN_NAME) 
INTO @list_of_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '$DB_NAME'
AND TABLE_NAME = '$TABLE2';

SET @sql = CONCAT('INSERT INTO ', '$TABLE1', ' (', @list_of_columns, ') SELECT ', @list_of_columns, ' FROM ', '$TABLE2');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
EOF

# Check for errors during MySQL query execution
if [ $? -eq 0 ]; then
	echo "Data merged successfully."
else
	echo "Error: Data merge failed."
fi
