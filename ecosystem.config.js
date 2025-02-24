module.exports = {
    apps: [
      {
          name: 'pl-radio',
          script: 'index.js',
          watch: true,
          autorestart: true,
          max_memory_restart: '1G',
          env: {
              NODE_ENV: 'development',
          },
      },
    ],
  };