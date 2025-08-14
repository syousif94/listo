import { Groq } from 'groq-sdk';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { stream } from 'hono/streaming';
import { createUserSession, verifyAppleToken, verifySession } from './auth';
import type { User } from './schema';

const app = new Hono<{
  Variables: {
    user: User;
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
    const { transcript, userTime } = await c.req.json();

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

              The current user's time and date is ${userTime}.
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
app.post('/chat', async (c) => {
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

              If the user references a list that you do not see and prefixes the name of the list with "The", ie "The Century List", use the list that is phonetically closest based on the existing lists. If the user does not say the before the list name, you should create a new list with the name they provide. If you see a phonetically similar exisitng list, always use that list instead of creating a new one.
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
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
  });
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
