#!/bin/bash

# This script removes only the reviewanything containers, images, and volumes related to frontend and backend services.

echo "Stopping the reviewanything frontend and backend containers..."
podman container stop frontend backend

echo "Removing the reviewanything frontend and backend containers..."
podman container rm frontend backend --force

# Update the image removal commands to match the actual image names
FRONTEND_IMAGES=$(podman images --filter=reference='localhost/reviewanything_frontend:latest' --format "{{.ID}}")
BACKEND_IMAGES=$(podman images --filter=reference='localhost/reviewanything_backend:latest' --format "{{.ID}}")

if [ -n "$FRONTEND_IMAGES" ]; then
    echo "Removing the reviewanything frontend images..."
    podman image rm --force $FRONTEND_IMAGES
else
    echo "No frontend images found to remove."
fi

if [ -n "$BACKEND_IMAGES" ]; then
    echo "Removing the reviewanything backend images..."
    podman image rm --force $BACKEND_IMAGES
else
    echo "No backend images found to remove."
fi

# Update the volume removal commands to match the actual volume names if necessary
echo "Listing all volumes..."
podman volume ls --filter=name=reviewanything --format "{{.Name}}"

echo "Removing the reviewanything frontend volumes..."
FRONTEND_VOLUMES=$(podman volume ls --filter=name=frontend --format "{{.Name}}")
if [ -n "$FRONTEND_VOLUMES" ]; then
    podman volume rm --force $FRONTEND_VOLUMES
else
    echo "No frontend volumes found to remove."
fi

echo "Removing the reviewanything backend volumes..."
BACKEND_VOLUMES=$(podman volume ls --filter=name=backend --format "{{.Name}}")
if [ -n "$BACKEND_VOLUMES" ]; then
    podman volume rm --force $BACKEND_VOLUMES
else
    echo "No backend volumes found to remove."
fi

echo "Pruning system..."
podman system prune --volumes --force

echo "Disk usage summary:"
podman system df

echo "Cleanup complete."
