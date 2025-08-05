import { appendFileSync, writeFileSync } from 'fs';
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions.mjs';

async function fetchTranscriptStream(transcript: string, token?: string) {
  const serverUrl = 'http://localhost:3000'; // Adjust port if different
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add authentication header if token is provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('🚀 Sending transcript to server...');
    console.log('Transcript:', transcript);
    console.log('URL:', `${serverUrl}/chat/stream`);
    
    const response = await fetch(`${serverUrl}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transcript }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    if (!response.body) {
      throw new Error('No response body received');
    }
    
    console.log('📡 Streaming response...\n');
    
    // Create output file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `stream-output-${timestamp}.txt`;
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let fullResponse = '';
    let chunkNumber = 0;
    
    // Write initial header to file
    writeFileSync(outputFile, `Stream output started at: ${new Date().toISOString()}\n`);
    appendFileSync(outputFile, `Transcript: ${transcript}\n`);
    appendFileSync(outputFile, `${'='.repeat(80)}\n\n`);
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
      chunkNumber++;
      
      // Print each chunk as it arrives to console
      process.stdout.write(chunk);
      
      // Write each chunk to file with metadata
      const chunkData = `--- Chunk ${chunkNumber} at ${new Date().toISOString()} ---\n${chunk}\n\n`;
      appendFileSync(outputFile, chunkData);
    }
    
    // Write final summary to file
    appendFileSync(outputFile, `${'='.repeat(80)}\n`);
    appendFileSync(outputFile, `Stream completed at: ${new Date().toISOString()}\n`);
    appendFileSync(outputFile, `Total chunks received: ${chunkNumber}\n`);
    appendFileSync(outputFile, `Full response length: ${fullResponse.length} characters\n`);
    appendFileSync(outputFile, `\nFull concatenated response:\n${fullResponse}\n`);
    
    console.log('\n\n✅ Stream completed');
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`📊 Total chunks: ${chunkNumber}`);
    console.log('Full response:', fullResponse);
    
    return fullResponse;
    
  } catch (error) {
    console.error('❌ Error fetching transcript stream:', error);
    throw error;
  }
}

// Test function to run the stream test
async function testChatStream() {
  const testTranscript = "I need to create a shopping list with milk, bread, eggs, and bananas. Also add a work list with finish project report, call client meeting, and review documents.";
  
  // Optional: Add your test token here if you want to test with authentication
  const testToken = process.env.TEST_TOKEN || undefined;
  
  if (testToken) {
    console.log('🔐 Using authentication token');
  } else {
    console.log('⚠️  No token provided - testing without authentication');
  }
  
  try {
    await fetchTranscriptStream(testTranscript, testToken);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Test the non-streaming endpoint
async function fetchTranscriptNonStream(transcript: string, token?: string) {
  const serverUrl = 'http://localhost:3000'; // Adjust port if different
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add authentication header if token is provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('🚀 Sending transcript to non-streaming endpoint...');
    console.log('Transcript:', transcript);
    console.log('URL:', `${serverUrl}/chat`);
    
    const response = await fetch(`${serverUrl}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transcript }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json() as ChatCompletion;

    result.choices.forEach(choice => {
      choice.message.tool_calls?.forEach(call => {
        console.log(`Tool call: ${call.function.name}`);
        console.log(`Parameters: ${JSON.stringify(call.function.arguments, null, 2)}`);
      });
    });

    console.log('📡 Response received...\n');
    console.log('✅ Full response:', JSON.stringify(result, null, 2));
    
    // Create output file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `non-stream-output-${timestamp}.json`;
    
    // Write response to file
    writeFileSync(outputFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      transcript,
      response: result
    }, null, 2));
    
    console.log(`📁 Output saved to: ${outputFile}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error fetching transcript (non-stream):', error);
    throw error;
  }
}

// Test function for non-streaming endpoint
async function testChatNonStream() {
  const testTranscript = "I need to create a shopping list with milk, bread, eggs, and bananas. Also add a work list with finish project report, call client meeting, and review documents.";
  
  // Optional: Add your test token here if you want to test with authentication
  const testToken = process.env.TEST_TOKEN || undefined;
  
  if (testToken) {
    console.log('🔐 Using authentication token');
  } else {
    console.log('⚠️  No token provided - testing without authentication');
  }
  
  try {
    await fetchTranscriptNonStream(testTranscript, testToken);
  } catch (error) {
    console.error('Non-stream test failed:', error);
    process.exit(1);
  }
}

// Simple test without authentication
async function testWithoutAuth() {
  console.log('🧪 Testing chat stream without authentication...\n');
  
  const testTranscript = "Create a grocery list: milk, bread, eggs, cheese, and apples";
  
  try {
    await fetchTranscriptStream(testTranscript);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Simple test for non-streaming without authentication
async function testNonStreamWithoutAuth() {
  console.log('🧪 Testing non-streaming chat without authentication...\n');
  
  const testTranscript = "I need to create a shopping list with milk, bread, eggs, and bananas. Also add a work list with finish project report, call client meeting, and review documents.";
  
  try {
    await fetchTranscriptNonStream(testTranscript);
  } catch (error) {
    console.error('Non-stream test failed:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const testType = args[0] || 'stream';
  
  console.log(`🧪 Running ${testType} test...\n`);
  
  switch (testType) {
    case 'stream':
      testChatStream();
      break;
    case 'non-stream':
    case 'nonstream':
      testChatNonStream();
      break;
    case 'stream-no-auth':
      testWithoutAuth();
      break;
    case 'non-stream-no-auth':
    case 'nonstream-no-auth':
      testNonStreamWithoutAuth();
      break;
    case 'both':
      console.log('🔄 Testing both endpoints...\n');
      testChatStream().then(() => {
        console.log('\n' + '='.repeat(50) + '\n');
        return testChatNonStream();
      });
      break;
    default:
      console.log('Usage: bun run test-stream.ts [stream|non-stream|stream-no-auth|non-stream-no-auth|both]');
      console.log('Default: stream');
  }
}