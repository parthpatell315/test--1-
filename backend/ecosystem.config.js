module.exports = {
  apps: [
    {
      name: 'trrabb-backend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 8000,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        API_TIMEOUT: 3000,
        RATE_LIMIT_WINDOW: 60000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        API_TIMEOUT: 3000,
        RATE_LIMIT_WINDOW: 60000,
      },
    },
  ],
};

