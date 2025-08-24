import { and, eq, gte, sum } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { stream } from 'hono/streaming';
import { createUserSession, verifyAppleToken, verifySession } from './auth';
import { db } from './db';
import type { NewTokenUsage, User } from './schema';
import { tokenUsage } from './schema';

const app = new Hono<{
  Variables: {
    user: User | { id: string; isPasswordBypass: boolean };
  };
}>();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Middleware
app.use('*', logger());
app.use('*', cors());

// Auth middleware
const authMiddleware = async (c: any, next: any) => {
  // Check for password bypass parameter
  try {
    const body = await c.req.json().catch(() => ({}));
    if (body.p && body.p === process.env.BYPASS_PASSWORD) {
      // Set a special user object for password bypass
      c.set('user', { id: 'password-bypass', isPasswordBypass: true });
      await next();
      return;
    }
  } catch {
    // If we can't parse JSON, continue with normal auth flow
  }

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

// Helper function to get total token usage for a user in the last 30 days
const getUserTokenUsage30Days = async (
  userId: string | null
): Promise<number> => {
  if (!userId) return 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db
    .select({ totalTokens: sum(tokenUsage.totalTokens) })
    .from(tokenUsage)
    .where(
      and(
        eq(tokenUsage.userId, userId),
        gte(tokenUsage.createdAt, thirtyDaysAgo)
      )
    );

  return Number(result[0]?.totalTokens || 0);
};

// Helper function to save token usage
const saveTokenUsage = async (user: any, usage: any): Promise<void> => {
  if (!usage) return;

  // Determine userId based on user type
  let userId: string | null = null;
  if (user?.isPasswordBypass) {
    userId = 'password-bypass';
  } else if (user?.id) {
    userId = user.id;
  }

  const newUsage: NewTokenUsage = {
    id: crypto.randomUUID(),
    userId: userId,
    completionTokens: usage.completion_tokens || 0,
    promptTokens: usage.prompt_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    completionTime: usage.completion_time || null,
    promptTime: usage.prompt_time || null,
    queueTime: usage.queue_time || null,
    totalTime: usage.total_time || null,
  };

  await db.insert(tokenUsage).values(newUsage);
};

// Token usage limit middleware
const tokenLimitMiddleware = async (c: any, next: any) => {
  const user = c.get('user');

  // If password bypass user, always allow but still track usage
  if (user?.isPasswordBypass) {
    await next();
    return;
  }

  // For regular users, check token limits
  if (user?.id && user.id !== 'password-bypass') {
    const tokenUsageAmount = await getUserTokenUsage30Days(user.id);

    if (tokenUsageAmount >= 1000000) {
      // 1 million tokens
      return c.json(
        {
          error: 'Token usage limit exceeded',
          message:
            'You have exceeded your monthly token limit of 1,000,000 tokens. Please try again next month.',
        },
        429
      );
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
    const { identityToken, authorizationCode } = await c.req.json();

    if (!identityToken) {
      return c.json({ error: 'Identity token is required' }, 400);
    }

    // Verify Apple token
    const applePayload = await verifyAppleToken(identityToken);

    // Create user session
    const { user, token } = await createUserSession(
      applePayload.sub,
      applePayload.email
    );

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    return c.json({ error: 'Authentication failed' }, 400);
  }
});

// Protected route for transcript processing (streaming)
app.post('/chat/stream', async (c) => {
  try {
    const { transcript } = await c.req.json();

    if (!transcript) {
      return c.json({ error: 'Transcript is required' }, 400);
    }

    // const user = c.get('user');
    // console.log(`Processing transcript for user: ${user.id}`);

    return stream(c, async (stream) => {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are an voice powered Todo List app called Listo. You should transform the user's transcript into professionally written lists of tasks. When creating new lists, do not include the word "list" in the title unless the user explicitly says to call it that.
              
              You should always respond with tool calls to create or update lists and tasks based on the transcript. The user will provide their entire existing list of tasks in addition to the transcript.

              You must respond in the correct tool call format. Do not respond with any other text or explanations.
              `,
            },
            {
              role: 'user',
              content: transcript,
            },
          ],
          tools: [
            {
              type: 'function',
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
              type: 'function',
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
              type: 'function',
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
              type: 'function',
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
              type: 'function',
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
              type: 'function',
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
          ],
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          temperature: 0,
          max_completion_tokens: 4096,
          top_p: 1,
          stream: true,
          stop: null,
        });

        for await (const chunk of chatCompletion) {
          console.log(chunk);
          await stream.write(`${JSON.stringify(chunk)}\n`);
        }
      } catch (error) {
        console.error('Groq API error:', error);
        await stream.write('Error: Failed to process request');
      }
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return c.json({ error: 'Failed to process transcript' }, 500);
  }
});

// Non-streaming endpoint for transcript processing
app.post('/chat', tokenLimitMiddleware, async (c) => {
  try {
    const { transcript } = await c.req.json();

    if (!transcript) {
      return c.json({ error: 'Transcript is required' }, 400);
    }

    // const user = c.get('user');
    // console.log(`Processing transcript for user: ${user.id}`);

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an voice powered Todo List app called Listo. You should transform the user's transcript into professionally written lists of tasks. When creating new lists, do not include the word "list" in the title unless the user explicitly says to call it that.
              
              You should always respond with tool calls to create or update lists and tasks based on the transcript. The user will provide their entire existing list of tasks in addition to the transcript.

              You must respond in the correct tool call format. Do not respond with any other text or explanations.
          `,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      tools: [
        {
          type: 'function',
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
          type: 'function',
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
          type: 'function',
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
          type: 'function',
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
          type: 'function',
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
          type: 'function',
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
      ],
      model: 'moonshotai/kimi-k2-instruct',
      temperature: 0,
      tool_choice: 'auto',
      max_completion_tokens: 4096,
    });

    console.log('Chat response:', response.choices[0]?.message);

    // Save token usage to database
    const user = c.get('user');
    if (response.usage) {
      try {
        await saveTokenUsage(user, response.usage);
      } catch (usageError) {
        console.error('Failed to save token usage:', usageError);
        // Don't fail the request if usage tracking fails
      }
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

  // Handle password bypass users
  if ('isPasswordBypass' in user && user.isPasswordBypass) {
    return c.json({
      id: user.id,
      isPasswordBypass: true,
      message: 'Password bypass user',
    });
  }

  return c.json({
    id: (user as User).id,
    email: (user as User).email,
    firstName: (user as User).firstName,
    lastName: (user as User).lastName,
    createdAt: (user as User).createdAt,
  });
});

// Get user token usage statistics
app.get('/user/token-usage', authMiddleware, async (c) => {
  const user = c.get('user');
  const isPasswordBypass = 'isPasswordBypass' in user && user.isPasswordBypass;

  try {
    const usage30Days = await getUserTokenUsage30Days(user.id);

    return c.json({
      usage30Days,
      limit: isPasswordBypass ? null : 1000000,
      remainingTokens: isPasswordBypass
        ? null
        : Math.max(0, 1000000 - usage30Days),
      percentageUsed: isPasswordBypass
        ? null
        : Math.round((usage30Days / 1000000) * 100),
      isPasswordBypass,
    });
  } catch (error) {
    console.error('Failed to get token usage:', error);
    return c.json({ error: 'Failed to retrieve token usage' }, 500);
  }
});

// Get password bypass usage statistics (admin endpoint)
app.get('/admin/password-bypass-usage', async (c) => {
  try {
    // Check if request has admin password
    const body = await c.req.json().catch(() => ({}));
    if (!body.p || body.p !== process.env.BYPASS_PASSWORD) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const usage30Days = await getUserTokenUsage30Days('password-bypass');

    return c.json({
      passwordBypassUsage30Days: usage30Days,
      message: 'Password bypass users have no usage limits',
    });
  } catch (error) {
    console.error('Failed to get password bypass usage:', error);
    return c.json({ error: 'Failed to retrieve usage' }, 500);
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
