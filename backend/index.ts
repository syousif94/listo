import { Groq } from 'groq-sdk';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
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

// Non-streaming endpoint for transcript processing
app.post('/chat', async (c) => {
  try {
    const { transcript, userTime, previousMessages } = await c.req.json();

    if (!transcript) {
      return c.json({ error: 'Transcript is required' }, 400);
    }

    // const user = c.get('user');
    // console.log(`Processing transcript for user: ${user.id}`);

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

    const response = await groq.chat.completions.create({
      messages,
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
