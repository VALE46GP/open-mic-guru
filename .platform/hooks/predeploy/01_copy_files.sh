#!/bin/bash
echo "Starting predeploy hook script"
echo "Contents of /var/app/staging before copy:"
ls -la /var/app/staging
echo "Contents of /var/app/staging/backend:"
ls -la /var/app/staging/backend
echo "Copying files..."
cp -rv /var/app/staging/backend/* /var/app/staging/
echo "Removing backend directory..."
rm -rf /var/app/staging/backend
echo "Final contents of /var/app/staging:"
ls -la /var/app/staging