import { Groq } from 'groq-sdk';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createUserSession, verifyAppleToken, verifySession } from './auth';
import { db } from './db';
import { tokenUsage, type User } from './schema';

const app = new Hono<{
  Variables: {
    user: User;
  };
}>();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to track token usage
async function trackTokenUsage(
  userId: string | null,
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
    completion_time?: number;
    prompt_time?: number;
    queue_time?: number;
    total_time?: number;
  }
) {
  if (!userId) return; // Don't track for unauthenticated users

  try {
    await db.insert(tokenUsage).values({
      id: crypto.randomUUID(),
      userId,
      completionTokens: usage.completion_tokens,
      promptTokens: usage.prompt_tokens,
      totalTokens: usage.total_tokens,
      completionTime: usage.completion_time,
      promptTime: usage.prompt_time,
      queueTime: usage.queue_time,
      totalTime: usage.total_time,
    });
  } catch (error) {
    console.error('Failed to track token usage:', error);
  }
}

// Middleware
app.use('*', logger());
app.use('*', cors());

// Auth middleware
const authMiddleware = async (c: any, next: any) => {
  const authorization = c.req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authorization.substring(7);
  const user = await verifySession(token);

  if (!user) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  c.set('user', user);
  await next();
};

// Optional auth middleware - sets user if token is present but doesn't require it
const optionalAuthMiddleware = async (c: any, next: any) => {
  const authorization = c.req.header('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7);
    const user = await verifySession(token);
    if (user) {
      c.set('user', user);
    }
  }
  await next();
};

// Routes
app.get('/', (c) => {
  return c.json({ message: 'Listo Backend API' });
});

// Apple Sign In
app.post('/auth/apple', async (c) => {
  try {
    const { identityToken, fullName } = await c.req.json();

    if (!identityToken) {
      return c.json({ error: 'Identity token is required' }, 400);
    }

    console.log('Received fullName:', fullName);

    // Verify Apple token
    const applePayload = await verifyAppleToken(identityToken);
    console.log('Apple user ID (sub):', applePayload.sub);

    // Use the formatted name directly if provided
    const name = fullName || undefined;
    console.log('Name to store:', name);

    // Create user session
    const { user, token } = await createUserSession(
      applePayload.sub,
      applePayload.email,
      name
    );

    console.log('Final user object:', {
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    return c.json({ error: 'Authentication failed' }, 400);
  }
});

// Non-streaming endpoint for transcript processing
app.post('/chat', optionalAuthMiddleware, async (c) => {
  try {
    const { transcript, userTime, previousMessages } = await c.req.json();

    if (!transcript) {
      return c.json({ error: 'Transcript is required' }, 400);
    }

    const user = c.get('user');
    if (user) {
      console.log(`Processing transcript for authenticated user: ${user.id}`);
    } else {
      console.log('Processing transcript for unauthenticated user');
    }

    // Build messages array with system prompt, previous messages, and current transcript
    const systemMessage = {
      role: 'system' as const,
      content: `You are an voice powered Todo List app called Listo. 
      
      Your job is to turn transcripts from the user into well organized lists.
      
      You must follow these rules:
      
      1. When creating new lists, do not include the word "list" in the title unless the user explicitly says to call it that.
          
      2. You should always respond with tool calls to create or update lists and tasks based on the transcript. The user will provide their entire existing list of tasks in addition to the transcript.

      3. You must respond in the correct tool call format. Do not respond with any other text or explanations.

      4. If the user references a list that you do not see and prefixes the name of the list with "The", ie "The Century List", use the list that is phonetically closest based on the existing lists. If the user does not say the before the list name, you should create a new list with the name they provide. If you see a phonetically similar exisitng list, always use that list instead of creating a new one.

      5. If the user provides a spelling for the name of the list, you should use that spelling for the name of the list. Always capitalize the first letter of each word in the list name, but do not use all caps, even if the user provides a spelling that way.

      <Example>

      <Transcript>Create a new list called century, spelled SENTRY and add Create a restarting cold war, spelled COLDBORE script. Also, a restarting ui and backend scripts.</Transcript>

      <Output> 
      {
        "tool_calls": [
          {
            "name": "createListWithTasks",
            "arguments": {
              "title": "Sentry",
              "tasks": [
                {
                  "text": "Create a restarting Coldbore script",
                  "completed": false
                },
                {
                  "text": "Create a restarting backend script",
                  "completed": false
                },
                {
                  "text": "Create a restarting UI script",
                  "completed": false
                }
              ]
            }
          }
        ]
      }
      </Output>
      </Example>

      The current user's time and date is ${userTime}.
      `,
    };

    // Construct messages array: system prompt, previous messages, current transcript
    const messages = [
      systemMessage,
      ...(previousMessages || []),
      {
        role: 'user' as const,
        content: transcript,
      },
    ];

    console.log(
      'Messages being sent to AI:',
      JSON.stringify(messages, null, 2)
    );

    const toolsConfig = [
      {
        type: 'function' as const,
        function: {
          name: 'createListWithTasks',
          description: 'Create a new list with an optional list of tasks',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    completed: { type: 'boolean' },
                    dueDate: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                  required: ['text'],
                },
              },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'createTodosInList',
          description: 'Create todos in an existing list',
          parameters: {
            type: 'object',
            properties: {
              listId: { type: 'string' },
              todos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    completed: { type: 'boolean' },
                    dueDate: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                  required: ['text'],
                },
              },
            },
            required: ['listId', 'todos'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'renameList',
          description: 'Rename a list',
          parameters: {
            type: 'object',
            properties: {
              listId: { type: 'string' },
              newTitle: { type: 'string' },
            },
            required: ['listId', 'newTitle'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'updateTodo',
          description: 'Update a todo item by id',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              text: { type: 'string' },
              completed: { type: 'boolean' },
              dueDate: {
                type: 'string',
                format: 'date-time',
              },
            },
            required: ['id'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'deleteTodo',
          description: 'Delete a todo item by id',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'deleteList',
          description: 'Delete a list by id',
          parameters: {
            type: 'object',
            properties: {
              listId: { type: 'string' },
            },
            required: ['listId'],
          },
        },
      },
    ];

    // Retry logic for Groq API call
    let response;
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Attempting Groq API call (attempt ${attempt}/${maxRetries})`
        );

        response = await groq.chat.completions.create({
          messages,
          tools: toolsConfig,
          model: 'moonshotai/kimi-k2-instruct',
          temperature: 0,
          tool_choice: 'auto',
          max_completion_tokens: 4096,
        });

        // If we get here, the call was successful
        break;
      } catch (error) {
        console.error(
          `Groq API call failed (attempt ${attempt}/${maxRetries}):`,
          error
        );

        // If this is the last attempt, we'll throw the error
        if (attempt === maxRetries) {
          throw error;
        }

        // Continue to next attempt
      }
    }

    if (!response) {
      throw new Error('Failed to get response from Groq API after all retries');
    }

    console.log('Chat response:', response.choices[0]?.message);

    // Track token usage if user is authenticated
    if (user && response.usage) {
      await trackTokenUsage(user.id, {
        completion_tokens: response.usage.completion_tokens,
        prompt_tokens: response.usage.prompt_tokens,
        total_tokens: response.usage.total_tokens,
        completion_time: response.usage.completion_time,
        prompt_time: response.usage.prompt_time,
        queue_time: response.usage.queue_time,
        total_time: response.usage.total_time,
      });
    }

    return c.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Failed to process transcript' }, 500);
  }
});

// Get user profile
app.get('/user/profile', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  });
});

// Get user token usage statistics
app.get('/user/usage', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const { eq, sum, count } = await import('drizzle-orm');

    const [usage] = await db
      .select({
        totalRequests: count(),
        totalTokens: sum(tokenUsage.totalTokens),
        totalPromptTokens: sum(tokenUsage.promptTokens),
        totalCompletionTokens: sum(tokenUsage.completionTokens),
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, user.id));

    return c.json({
      usage: {
        totalRequests: usage?.totalRequests || 0,
        totalTokens: usage?.totalTokens || 0,
        totalPromptTokens: usage?.totalPromptTokens || 0,
        totalCompletionTokens: usage?.totalCompletionTokens || 0,
      },
    });
  } catch (error) {
    console.error('Failed to get usage statistics:', error);
    return c.json({ error: 'Failed to get usage statistics' }, 500);
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 3000;

console.log(`🚀 Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
