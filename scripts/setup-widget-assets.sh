#!/bin/bash

# Widget Assets Setup Script
# Adds optimized widget images to Xcode Asset Catalog

set -e

ASSET_CATALOG="ios/BrigoWidget/Assets.xcassets"
SOURCE_DIR="assets/widget-optimized"

echo "🎨 Setting up widget assets..."

# Function to create image set
create_imageset() {
    local name=$1
    local source_path=$2
    local imageset_dir="$ASSET_CATALOG/${name}.imageset"

    echo "  Creating ${name}..."

    # Create directory
    mkdir -p "$imageset_dir"

    # Find and copy images
    local has_1x=false
    local has_2x=false
    local has_3x=false

    if [ -f "${source_path}.png" ]; then
        cp "${source_path}.png" "$imageset_dir/${name}.png"
        has_1x=true
    fi

    if [ -f "${source_path}@2x.png" ]; then
        cp "${source_path}@2x.png" "$imageset_dir/${name}@2x.png"
        has_2x=true
    fi

    if [ -f "${source_path}@3x.png" ]; then
        cp "${source_path}@3x.png" "$imageset_dir/${name}@3x.png"
        has_3x=true
    fi

    # Create Contents.json
    cat > "$imageset_dir/Contents.json" <<EOF
{
  "images" : [
EOF

    if [ "$has_1x" = true ]; then
        cat >> "$imageset_dir/Contents.json" <<EOF
    {
      "filename" : "${name}.png",
      "idiom" : "universal",
      "scale" : "1x"
    },
EOF
    else
        cat >> "$imageset_dir/Contents.json" <<EOF
    {
      "idiom" : "universal",
      "scale" : "1x"
    },
EOF
    fi

    if [ "$has_2x" = true ]; then
        cat >> "$imageset_dir/Contents.json" <<EOF
    {
      "filename" : "${name}@2x.png",
      "idiom" : "universal",
      "scale" : "2x"
    },
EOF
    else
        cat >> "$imageset_dir/Contents.json" <<EOF
    {
      "idiom" : "universal",
      "scale" : "2x"
    },
EOF
    fi

    if [ "$has_3x" = true ]; then
        cat >> "$imageset_dir/Contents.json" <<EOF
    {
      "filename" : "${name}@3x.png",
      "idiom" : "universal",
      "scale" : "3x"
    }
EOF
    else
        cat >> "$imageset_dir/Contents.json" <<EOF
    {
      "idiom" : "universal",
      "scale" : "3x"
    }
EOF
    fi

    cat >> "$imageset_dir/Contents.json" <<EOF
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF
}

# Brigo moods
echo "📊 Adding Brigo moods..."
create_imageset "brigo-happy" "$SOURCE_DIR/brigo/happy"
create_imageset "brigo-angry" "$SOURCE_DIR/brigo/angry"
create_imageset "brigo-smug" "$SOURCE_DIR/brigo/smug"
create_imageset "brigo-proud" "$SOURCE_DIR/brigo/proud"
create_imageset "brigo-analytical" "$SOURCE_DIR/brigo/analytical"

# Pet stages
echo "🐾 Adding pet stages..."
create_imageset "pet-stage1-bubble" "$SOURCE_DIR/pets/stage-1/bubble"
create_imageset "pet-stage1-dying" "$SOURCE_DIR/pets/stage-1/dying"
create_imageset "pet-stage2-bubble" "$SOURCE_DIR/pets/stage-2/bubble"
create_imageset "pet-stage2-dying" "$SOURCE_DIR/pets/stage-2/dying"
create_imageset "pet-stage3-bubble" "$SOURCE_DIR/pets/stage-3/bubble"
create_imageset "pet-stage3-dying" "$SOURCE_DIR/pets/stage-3/dying"

echo ""
echo "✅ Widget assets added successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npx expo run:ios"
echo "2. Navigate to Settings > Widget Test"
echo "3. Tap 'Send Placeholder Data'"
echo "4. Add the Brigo widget to your home screen"
echo ""
