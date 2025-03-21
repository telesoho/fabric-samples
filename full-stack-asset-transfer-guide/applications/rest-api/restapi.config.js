module.exports = {
  apps: [
    {
      name: 'fabric_api',
      script: './dist/index.js',
      env_development: {
        PORT: 3000,
        NODE_ENV: 'development',
      },
      node_args:"--trace-warnings",
      env_production: {
        PORT: 80,
        NODE_ENV: 'production',
      },
    },
  ],
};
