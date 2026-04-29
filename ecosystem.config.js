module.exports = {
  apps: [{
    name: 'registro-civil-bot',
    script: 'src/bot.js',
    restart_delay: 5000,
    max_restarts: 10,
    env_file: '.env',
  }],
};
