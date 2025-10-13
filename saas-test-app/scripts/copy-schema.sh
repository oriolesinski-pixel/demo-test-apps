#!/bin/bash
# Copy database schema to clipboard

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCHEMA_FILE="$SCRIPT_DIR/../supabase-schema.sql"

if [ -f "$SCHEMA_FILE" ]; then
    cat "$SCHEMA_FILE" | pbcopy
    echo "✅ Database schema copied to clipboard!"
    echo ""
    echo "Next steps:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your TaskFlow project"
    echo "3. Click 'SQL Editor' in the left sidebar"
    echo "4. Click 'New Query'"
    echo "5. Paste (Cmd+V) and click 'Run'"
    echo ""
    echo "You should see: 'Success. No rows returned'"
else
    echo "❌ Error: Schema file not found at $SCHEMA_FILE"
    exit 1
fi

