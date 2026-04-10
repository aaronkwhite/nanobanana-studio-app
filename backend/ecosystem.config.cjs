module.exports = {
  apps: [
    {
      name: 'nana-backend',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--experimental-transform-types',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
