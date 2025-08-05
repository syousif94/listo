# Audio Processing Integration Guide

This guide explains how to use the updated audio processing system that integrates with the chat API and Zustand store.

## Overview

The audio processing service now:

1. Converts recorded audio to Whisper-compatible format
2. Transcribes audio using Whisper
3. Prepends current todo lists to the transcript
4. Sends the full transcript to the chat API
5. Processes tool calls from the API to update the store
6. Displays processing state and errors in the UI

## Updated Components

### 1. Store (todoStore.ts)

**New State:**

```typescript
export interface AudioProcessingState {
  isProcessing: boolean;
  error?: string;
  lastTranscript?: string;
}
```

**New Methods:**

- `updateAudioProcessing(updates)` - Update processing state
- `resetAudioProcessing()` - Reset processing state
- `getCurrentListsString()` - Get formatted list of current todos
- `createListWithTasks(title, tasks)` - Create list with optional tasks
- `renameList(listId, newTitle)` - Rename an existing list

### 2. Audio Processing Service (audioProcessingService.ts)

**New Function:**

```typescript
export async function processTranscriptWithChat(
  transcript: string
): Promise<ChatResponse>;
```

This function:

- Gets current lists from store using `getCurrentListsString()`
- Prepends lists to transcript: `"${currentLists}\n\nNew request: ${transcript}"`
- Sends to chat API at `http://localhost:3000/chat`
- Processes tool calls from response:
  - `createListWithTasks` - Creates new list with tasks
  - `renameList` - Renames existing list
- Updates store with processing state and errors

**Updated Function:**

```typescript
export async function processRecordingComplete(recordingPath: string);
```

Now:

- Updates store processing state during operation
- Shows detailed error messages if processing fails
- Stores last transcript even on error

### 3. RecordingButton Component

**Enhanced Error Display:**

- Shows error messages from store in processing view
- Displays last transcript when errors occur
- Uses store state instead of local error handling

### 4. New AudioProcessingStatus Component

A new overlay component that shows:

- Processing indicator when audio is being processed
- Error messages with last transcript
- Positioned at top of screen, auto-hides when not needed

## Configuration

**Backend URL:**
Update the API endpoint in `audioProcessingService.ts`:

```typescript
const API_ENDPOINT = 'http://localhost:3000/chat'; // <-- Change this to your backend URL
```

## Usage Examples

### Getting Processing State

```typescript
import { useTodoStore } from '../store/todoStore';

function MyComponent() {
  const { audioProcessing } = useTodoStore();
  const { isProcessing, error, lastTranscript } = audioProcessing;

  if (isProcessing) {
    return <Text>Processing...</Text>;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return <Text>Ready</Text>;
}
```

### Manual Processing

```typescript
import { processRecordingComplete } from '../services/audioProcessingService';

async function processAudio(audioPath: string) {
  const result = await processRecordingComplete(audioPath);

  if (result.success) {
    console.log('Success:', result.transcript);
  } else {
    console.log('Error:', result.error);
  }
}
```

### Getting Current Lists

```typescript
import { useTodoStore } from '../store/todoStore';

function getCurrentTodos() {
  const getCurrentListsString = useTodoStore.getState().getCurrentListsString;
  const listsString = getCurrentListsString();
  console.log('Current todos:', listsString);
}
```

## Chat API Tool Calls

The system expects these tool calls from the chat API:

**createListWithTasks:**

```json
{
  "function": {
    "name": "createListWithTasks",
    "arguments": "{\"title\":\"Grocery List\",\"tasks\":[{\"title\":\"Milk\"},{\"title\":\"Bread\"}]}"
  }
}
```

**renameList:**

```json
{
  "function": {
    "name": "renameList",
    "arguments": "{\"listId\":\"abc123\",\"newTitle\":\"Weekly Shopping\"}"
  }
}
```

## Error Handling

Errors are automatically stored in the audioProcessing state and can be displayed:

- Transcription errors
- Network errors
- API errors
- Tool call processing errors

The system continues to work even if some steps fail, providing graceful degradation.
