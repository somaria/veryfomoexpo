# Firestore Indexes Required for VeryFomo

## Chat Index

You need to create a composite index for the chats collection. The error message provides a direct link to create this index:

[Create Chats Index](https://console.firebase.google.com/v1/r/project/veryfomo/firestore/indexes?create_composite=CkZwcm9qZWN0cy92ZXJ5Zm9tby9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY2hhdHMvaW5kZXhlcy9fEAEaEAoMcGFydGljaXBhbnRzGAEaDQoJdXBkYXRlZEF0EAIaDAoIX19uYW1lX18QAg)

Alternatively, you can manually create the index with these settings:

1. Collection: `chats`
2. Fields to index:
   - `participants` (Array contains)
   - `updatedAt` (Descending)
3. Query scope: Collection

## Manual Index Creation Steps

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database
4. Click on the "Indexes" tab
5. Click "Create Index"
6. Fill in the details as described above
7. Click "Create"

The index may take a few minutes to build after creation.
