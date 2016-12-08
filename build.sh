#!/bin/bash
# build.sh -- builds JAR and XPI files for mozilla extensions
#   by Nickolay Ponomarev <asqueella@gmail.com>
#   (original version based on Nathan Yergler's build script)
# Most recent version is at <http://kb.mozillazine.org/Bash_build_script>

# This script assumes the following directory structure:
# ./
#   chrome.manifest (optional - for newer extensions)
#   install.rdf
#   (other files listed in $ROOT_FILES)
#
#   content/    |
#   locale/     |} these can be named arbitrary and listed in $CHROME_PROVIDERS
#   skin/       |
#
#   defaults/   |
#   components/ |} these must be listed in $ROOT_DIRS in order to be packaged
#   ...         |
#
# It uses a temporary directory ./build when building; don't use that!
# Script's output is:
# ./$APP_NAME.xpi
# ./files -- the list of packaged files
#
# Note: It modifies chrome.manifest when packaging so that it points to
#       chrome/$APP_NAME.jar!/*

#
# default configuration file is ./config_build.sh, unless another file is
# specified in command-line. Available config variables:
APP_NAME=          # short-name, jar and xpi files name. Must be lowercase with no spaces
CHROME_PROVIDERS=  # which chrome providers we have (space-separated list)
CLEAN_UP=          # delete the jar / "files" when done?       (1/0)
ROOT_FILES=        # put these files in root of xpi (space separated list of leaf filenames)
ROOT_DIRS=         # ...and these directories       (space separated list)
BEFORE_BUILD=      # run this before building       (bash command)
AFTER_BUILD=       # ...and this after the build    (bash command)

if [ -z $1 ]; then
  . ./config_build.sh
else
  . $1
fi

if [ -z $APP_NAME ]; then
  echo "You need to create build config file first!"
  echo "Read comments at the beginning of this script for more info."
  exit;
fi

ROOT_DIR=`pwd`
TMP_DIR=build
EXCLUDED_EXTENSIONS_PATTERN=`echo $EXCLUDED_EXTENSIONS | sed s/[[:alnum:]_][[:alnum:]_]*/-e\ \\\\\\\\.\&$/g`

#uncomment to debug
#set -x

# remove any left-over files from previous build
rm -f $APP_NAME.xpi files
rm -rf $TMP_DIR

$BEFORE_BUILD

mkdir --parents --verbose $TMP_DIR/chrome

# move chrome providers to chrome dir
echo "Generating $TMP_DIR/chrome..."
for CHROME_SUBDIR in $CHROME_PROVIDERS; do
  find $CHROME_SUBDIR -type f -print | grep -v -e \~ $EXCLUDED_EXTENSIONS_PATTERN >> files
done

cp --verbose --parents `cat files` $TMP_DIR/chrome

# prepare components and defaults
echo "Copying various files to $TMP_DIR folder..."
for DIR in $ROOT_DIRS; do
  mkdir $TMP_DIR/$DIR
  FILES="`find $DIR -type f -print | grep -v -e \~ $EXCLUDED_EXTENSIONS_PATTERN`"
  echo $FILES >> files
  cp --verbose --parents $FILES $TMP_DIR
done

# Copy other files to the root of future XPI.
for ROOT_FILE in $ROOT_FILES install.rdf chrome.manifest; do
  cp --verbose $ROOT_FILE $TMP_DIR
  if [ -f $ROOT_FILE ]; then
    echo $ROOT_FILE >> files
  fi
done

cd $TMP_DIR

# No JAR file
if [ -f "chrome.manifest" ]; then
  echo "Preprocessing chrome.manifest..."
  sed -i -r "s ^(content\s+\S*\s+)(.*)$ \1chrome/\2 " chrome.manifest
  sed -i -r "s ^(skin|locale)(\s+\S*\s+\S*\s+)(.*)$ \1\2chrome/\3 " chrome.manifest
  # (it simply adds chrome/ at appropriate positions of chrome.manifest)
fi

# Remove the line to register test code in chrome
if [ -f "chrome.manifest" ]; then
  echo "Removing test registration from chrome.manifest..."
  sed -i -r s/^.*foxreplace-test.*$// chrome.manifest
fi

# generate the XPI file
echo "Generating $APP_NAME.xpi..."
zip -r ../$APP_NAME.xpi *

cd "$ROOT_DIR"

echo "Cleanup..."
if [ $CLEAN_UP != 0 ]; then
  # remove the working files
  rm ./files
  rm -rf $TMP_DIR
fi

echo "Done!"

$AFTER_BUILD
