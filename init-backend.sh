#!/bin/bash

echo "Creating MyCafe backend structure..."

# root
mkdir -p backend/src

# config
mkdir -p backend/src/config
touch backend/src/config/{database.config.js,auth.config.js,app.config.js}

# modules
modules=(auth users roles cafes tables menu orders payments reservations reports)

for module in "${modules[@]}"; do
  mkdir -p backend/src/modules/$module
  touch backend/src/modules/$module/$module.controller.js
  touch backend/src/modules/$module/$module.service.js
  touch backend/src/modules/$module/$module.repository.js
  touch backend/src/modules/$module/$module.routes.js
  touch backend/src/modules/$module/$module.dto.js
done

# middlewares
mkdir -p backend/src/middlewares
touch backend/src/middlewares/{auth.middleware.js,error.middleware.js,validation.middleware.js}

# utils
mkdir -p backend/src/utils
touch backend/src/utils/{logger.js,date.util.js,pagination.util.js}

# database
mkdir -p backend/src/database/{migrations,seeds}
touch backend/src/database/connection.js

# docs
mkdir -p backend/src/docs
touch backend/src/docs/swagger.js

# core files
touch backend/src/{app.js,server.js}

# tests
mkdir -p backend/tests

# env + root files
touch backend/.env
touch backend/package.json
touch backend/README.md

echo "Backend structure created successfully."
