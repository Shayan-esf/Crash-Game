module.exports = {
  apps: [
    {
      name: 'crash-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'crash-ws',
      script: 'ws-server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
    },
    {
      name: 'crash-bot',
      script: 'server/bot.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
