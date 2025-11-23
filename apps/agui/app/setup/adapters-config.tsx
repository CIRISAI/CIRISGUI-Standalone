// Adapter configuration data
export const ADAPTERS = {
  core: [
    {
      id: "api",
      name: "API Adapter",
      description:
        "RESTful API server with OAuth2 authentication, role-based access control, and WebSocket support. Includes 150+ REST endpoints with full OpenAPI documentation.",
      tools: 3,
      required: true,
      configFields: [
        {
          name: "port",
          label: "API Port",
          type: "number",
          default: "8080",
          description: "Port to bind the API server (default: 8080)",
        },
      ],
    },
    {
      id: "cli",
      name: "CLI Adapter",
      description:
        "Interactive command-line interface for development and testing. Includes mock LLM integration for offline operation and debugging tools.",
      tools: 2,
      required: false,
      configFields: [],
    },
    {
      id: "discord",
      name: "Discord Adapter",
      description:
        "Discord bot for community moderation. Multi-channel support, Wise Authority deferral, real-time monitoring, content filtering, and role management.",
      tools: 12,
      required: false,
      configFields: [
        {
          name: "bot_token",
          label: "Bot Token",
          type: "password",
          envVar: "DISCORD_BOT_TOKEN",
          description: "Discord bot token from https://discord.com/developers/applications",
          required: true,
        },
        {
          name: "channel_id",
          label: "Channel ID",
          type: "text",
          envVar: "DISCORD_CHANNEL_ID",
          description: "Discord channel ID to monitor and interact with",
          required: true,
        },
      ],
    },
    {
      id: "reddit",
      name: "Reddit Adapter",
      description:
        "Reddit integration for subreddit moderation. Post, reply, moderate with AI transparency disclosure and deletion compliance.",
      tools: 8,
      required: false,
      configFields: [
        {
          name: "client_id",
          label: "Client ID",
          type: "text",
          envVar: "CIRIS_REDDIT_CLIENT_ID",
          description: "Reddit app client ID from https://www.reddit.com/prefs/apps",
          required: true,
        },
        {
          name: "client_secret",
          label: "Client Secret",
          type: "password",
          envVar: "CIRIS_REDDIT_CLIENT_SECRET",
          description: "Reddit app client secret",
          required: true,
        },
        {
          name: "username",
          label: "Username",
          type: "text",
          envVar: "CIRIS_REDDIT_USERNAME",
          description: "Reddit account username",
          required: true,
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          envVar: "CIRIS_REDDIT_PASSWORD",
          description: "Reddit account password",
          required: true,
        },
      ],
    },
  ],
  modular: [
    {
      id: "external_data_sql",
      name: "SQL Database Connector",
      description:
        "SQL database access for DSAR automation and external data queries. Supports SQLite, MySQL, and PostgreSQL with dialect-aware operations.",
      tools: 5,
      configFields: [],
    },
    {
      id: "geo_wisdom",
      name: "Geographic Navigation",
      description:
        "Location-based queries and navigation assistance via OpenStreetMap integration. Provides safe geographic information.",
      tools: 3,
      configFields: [],
    },
    {
      id: "weather_wisdom",
      name: "Weather Advisories",
      description:
        "Real-time weather information and advisories via NOAA API integration. Provides weather forecasts and alerts.",
      tools: 2,
      configFields: [],
    },
    {
      id: "sensor_wisdom",
      name: "IoT Sensor Integration",
      description:
        "Home Assistant integration for IoT sensor interpretation. Filters medical sensors for safety compliance.",
      tools: 4,
      configFields: [],
    },
  ],
};
