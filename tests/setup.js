/**
 * Jest test setup file
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test_token';
process.env.CLIENT_ID = 'test_client_id';
process.env.GUILD_ID = 'test_guild_id';
process.env.MONGODB_URI = 'mongodb://localhost:27017/shinra-bot-test';
process.env.FINDCORD_API = 'test_api_key';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Mock Discord.js
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    destroy: jest.fn(),
    user: { tag: 'TestBot#1234' },
    guilds: { cache: new Map() },
    users: { cache: new Map() },
    ws: { status: 0, ping: 50 }
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMembers: 2,
    GuildMessages: 4,
    MessageContent: 8
  },
  Collection: Map,
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
    setAuthor: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  ActionRowBuilder: jest.fn().mockImplementation(() => ({
    addComponents: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  ButtonBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setLabel: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
    setDisabled: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4
  },
  ComponentType: {
    Button: 2
  },
  SlashCommandBuilder: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addUserOption: jest.fn().mockReturnThis(),
    addStringOption: jest.fn().mockReturnThis(),
    addIntegerOption: jest.fn().mockReturnThis(),
    addSubcommand: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  Events: {
    Ready: 'ready',
    InteractionCreate: 'interactionCreate',
    MessageCreate: 'messageCreate',
    GuildMemberAdd: 'guildMemberAdd',
    GuildMemberUpdate: 'guildMemberUpdate'
  }
}));

// Mock Mongoose
const mockModel = jest.fn().mockImplementation(() => ({
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue([])
    })
  }),
  create: jest.fn().mockResolvedValue({}),
  save: jest.fn().mockResolvedValue({}),
  findOneAndUpdate: jest.fn().mockResolvedValue(null),
  findOneAndDelete: jest.fn().mockResolvedValue(null)
}));

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    readyState: 1,
    on: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
    db: {
      listCollections: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        }),
        findOne: jest.fn().mockResolvedValue(null),
        findOneAndUpdate: jest.fn().mockResolvedValue(null),
        findOneAndDelete: jest.fn().mockResolvedValue(null),
        insertMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({})
      })
    }
  },
  Schema: jest.fn().mockImplementation(() => ({})),
  model: jest.fn().mockReturnValue(mockModel)
}));

// Mock Axios
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      Sicil: [],
      MemberInfo: {
        TopName: 'Test User',
        TopAge: '25',
        TopSex: 'Male'
      }
    }
  })
}));

// Global test timeout
jest.setTimeout(10000);
