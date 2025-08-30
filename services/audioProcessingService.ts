import type { ChatCompletion } from 'groq-sdk/resources/chat/completions.mjs';
import { API_ENDPOINTS } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import { useTodoStore } from '../store/todoStore';

export interface TranscriptionResult {
  transcript: string;
  audioPath: string;
  success: boolean;
  error?: string;
}

// Function to send transcript to chat API and process tool calls
export async function processTranscriptWithChat(
  transcript: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🌐 Sending transcript to chat API:', transcript);

    const todoStore = useTodoStore.getState();

    // Get current lists from store
    const currentLists = todoStore.getCurrentListsString();

    // Prepend current lists to transcript
    const fullTranscript = `<Existing-Lists>
    ${currentLists}
    </Existing-Lists>
    <Transcript>
    ${transcript}
    </Transcript>`;

    console.log('📋 Full transcript with current lists:', fullTranscript);

    // Get chat history formatted for API (excluding system messages to avoid duplication)
    const previousMessages = todoStore
      .getChatHistoryForAPI()
      .filter((msg) => msg.role !== 'system');

    console.log(
      '💬 Including previous messages in context:',
      previousMessages.length
    );

    // Use configured API endpoint
    const API_ENDPOINT = API_ENDPOINTS.chat;

    // Get current time with timezone
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timeZoneName: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Get auth headers
    const authStore = useAuthStore.getState();
    const headers = authStore.getAuthHeaders();

    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for chat requests

      response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcript: fullTranscript,
          userTime: currentTime,
          previousMessages,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (networkError: any) {
      console.log(
        '🌐 Network error during chat request:',
        networkError.message
      );

      const store = useTodoStore.getState();

      // Handle different types of network errors
      if (networkError.name === 'AbortError') {
        store.showToast('Request timed out. Please try again.', 'error');
      } else if (
        networkError.name === 'TypeError' &&
        networkError.message.includes('Failed to fetch')
      ) {
        store.showToast(
          'Unable to connect to server. Please check your connection.',
          'error'
        );
      } else {
        store.showToast('Network error occurred. Please try again.', 'error');
      }

      return {
        success: false,
        error: `Network error: ${networkError.message}`,
      };
    }

    if (!response.ok) {
      const store = useTodoStore.getState();
      let errorMessage = 'Server error occurred';

      try {
        const errorText = await response.text();
        console.log('❌ Chat API request failed:', response.status, errorText);

        // Provide user-friendly error messages based on status code
        if (response.status >= 500) {
          errorMessage =
            'Server is temporarily unavailable. Please try again later.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication expired. Please sign in again.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid request. Please try again.';
        } else {
          errorMessage = `Server error (${response.status}). Please try again.`;
        }
      } catch (parseError) {
        console.log('❌ Failed to parse error response:', parseError);
        errorMessage = 'Server error occurred. Please try again.';
      }

      store.showToast(errorMessage, 'error');

      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = (await response.json()) as ChatCompletion;
    console.log('✅ Chat API response received:', result);

    // Extract tool calls from the response
    const toolCalls = result.choices?.[0]?.message?.tool_calls || [];

    if (toolCalls.length === 0) {
      console.log('⚠️ No tool calls found in response');

      // Still store the assistant response in chat history even if no tool calls
      const assistantMessage = result.choices?.[0]?.message;
      if (assistantMessage) {
        todoStore.addChatMessage({
          role: 'assistant',
          content: assistantMessage.content || 'No action taken',
          timestamp: new Date().toISOString(),
          tool_calls: assistantMessage.tool_calls,
        });
      }

      return {
        success: true,
      };
    }

    console.log('🔧 Processing tool calls:', toolCalls);

    // Store the user message in chat history
    const timestamp = new Date().toISOString();
    todoStore.addChatMessage({
      role: 'user',
      content: fullTranscript,
      timestamp,
    });

    // Process each tool call
    const store = useTodoStore.getState();

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`🔧 Executing tool call: ${functionName}`, args);

        switch (functionName) {
          case 'createListWithTasks':
            // Handle both 'text' and 'title' properties for backward compatibility
            const normalizedTasks = args.tasks?.map((task: any) => ({
              text: task.text || task.title,
              completed: task.completed || false,
              dueDate: task.dueDate,
            }));
            store.createListWithTasks(args.title, normalizedTasks);
            console.log(`✅ Created list: ${args.title}`);
            break;

          case 'createTodosInList':
            store.createTodosInList(args.listId, args.todos);
            console.log(
              `✅ Added ${args.todos?.length || 0} todos to list: ${
                args.listId
              }`
            );
            break;

          case 'renameList':
            store.renameList(args.listId, args.newTitle);
            console.log(`✅ Renamed list ${args.listId} to: ${args.newTitle}`);
            break;

          case 'updateTodo':
            console.log('Updating todo with args:', args);
            store.updateTodoById(args.id, args);
            console.log(`✅ Updated todo: ${args.id}`);
            break;

          case 'deleteTodo':
            store.deleteTodoById(args.id);
            console.log(`✅ Deleted todo: ${args.id}`);
            break;

          case 'deleteList':
            store.deleteList(args.listId);
            console.log(`✅ Deleted list: ${args.listId}`);
            break;

          default:
            console.warn(`⚠️ Unknown tool call: ${functionName}`);
        }
      } catch (toolError) {
        console.error('❌ Error processing tool call:', toolCall, toolError);
        // Continue processing other tool calls even if one fails
      }
    }

    // Store the assistant response in chat history
    const assistantMessage = result.choices?.[0]?.message;
    if (assistantMessage) {
      todoStore.addChatMessage({
        role: 'assistant',
        content: assistantMessage.content || '',
        timestamp: new Date().toISOString(),
        tool_calls: assistantMessage.tool_calls,
      });
    }

    return {
      success: true,
    };
  } catch (error) {
    console.log('❌ Failed to process transcript with chat:', error);

    // Show toast notification for processing errors
    const store = useTodoStore.getState();

    let userFriendlyMessage = 'Processing failed';
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Provide user-friendly messages for common error types
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network error')
      ) {
        userFriendlyMessage =
          'Unable to connect to server. Please check your connection.';
      } else if (error.message.includes('JSON')) {
        userFriendlyMessage = 'Server response error. Please try again.';
      } else {
        userFriendlyMessage = 'Processing failed. Please try again.';
      }
    }

    store.showToast(userFriendlyMessage, 'error');

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Main function that handles transcript processing (without audio transcription)
export async function processTranscriptDirectly(transcript: string): Promise<{
  transcript: string;
  success: boolean;
  error?: string;
}> {
  // Update store to show processing started
  const store = useTodoStore.getState();
  store.updateAudioProcessing({ isProcessing: true, error: undefined });

  try {
    console.log('🎯 Starting transcript processing...');

    if (!transcript.trim()) {
      const error = 'No transcript provided';
      store.updateAudioProcessing({
        isProcessing: false,
        error,
        lastTranscript: transcript,
      });

      // Show toast for empty transcript
      store.showToast('No transcript provided', 'error');

      return {
        transcript: '',
        success: false,
        error,
      };
    }

    console.log('📝 Processing transcript with chat API...');
    store.updateAudioProcessing({
      lastTranscript: transcript,
    });

    // Process with chat API
    const chatResult = await processTranscriptWithChat(transcript);

    if (!chatResult.success) {
      const error = `Chat processing failed: ${chatResult.error}`;
      store.updateAudioProcessing({
        isProcessing: false,
        error,
      });

      // Show toast for chat processing failure
      store.showToast(error, 'error');

      return {
        transcript,
        success: false,
        error,
      };
    }

    console.log('🎉 Transcript processing successful!');
    store.updateAudioProcessing({
      isProcessing: false,
      error: undefined,
    });

    return {
      transcript,
      success: true,
    };
  } catch (error) {
    console.log('❌ Transcript processing failed:', error);

    let errorMessage = 'Unknown error in processing flow';
    let userFriendlyMessage = 'Processing failed. Please try again.';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Provide user-friendly messages
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network error')
      ) {
        userFriendlyMessage =
          'Unable to connect to server. Please check your connection.';
      } else if (error.message.includes('Authentication')) {
        userFriendlyMessage = 'Authentication failed. Please sign in again.';
      }
    }

    store.updateAudioProcessing({
      isProcessing: false,
      error: errorMessage,
    });

    // Show user-friendly toast message
    store.showToast(userFriendlyMessage, 'error');

    return {
      transcript,
      success: false,
      error: errorMessage,
    };
  }
}
