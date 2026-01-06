#!/bin/bash
# Development server startup script
# This ensures go.work is used for local module development

set -e

# Handle clean command
if [ "$1" = "clean" ]; then
    echo "🧹 Cleaning Hugo caches and generated files..."
    echo ""
    echo "Removing Hugo module cache..."
    hugo mod clean || true
    echo "Removing Hugo cache directory..."
    sudo rm -rf ~/Library/Caches/hugo_cache || true
    echo "Removing generated resources..."
    rm -rf resources/ public/ _vendor/ || true
    echo ""
    echo "✅ Clean complete! Run './dev-server.sh' to start the server."
    exit 0
fi

echo "🚀 Starting Hugo development server with local modules..."
echo ""

# Check if go.work exists
if [ ! -f "go.work" ]; then
    echo "❌ Error: go.work file not found!"
    echo "Please create it first (see DEVELOPMENT.md)"
    exit 1
fi

# Check if sibling directories exist
if [ ! -d "../hugo-haptic-theme" ]; then
    echo "⚠️  Warning: ../hugo-haptic-theme not found"
    echo "Theme will be fetched from GitHub instead"
fi

if [ ! -d "../garden" ]; then
    echo "⚠️  Warning: ../garden not found"
    echo "Content will be fetched from GitHub instead"
fi

# Set environment variable for Hugo to use go.work
export HUGO_MODULE_WORKSPACE=go.work

echo "📦 Module graph:"
hugo mod graph
echo ""

echo "🌐 Starting server at http://localhost:1313"
echo "   Press Ctrl+C to stop"
echo ""
echo "✨ Live reload enabled:"
echo "   - Edit ../hugo-haptic-theme/ → browser refreshes"
echo "   - Edit ../garden/content/ → browser refreshes"
echo "   - Edit config/ → browser refreshes"
echo ""

# Start Hugo server with drafts
hugo server -D --disableFastRender --navigateToChanged
