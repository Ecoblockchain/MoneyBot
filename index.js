const config = require('./lib/config');
const DiscordBot = require('./lib/bot').DiscordBot;

var bot = null;

config.load(config => {
    bot = new DiscordBot(config);
});

process.on('SIGINT', () => {
    // Bot has 1 second to clean up before we exit
    setTimeout(process.exit, 1000);

    bot.cleanUp(() => {
        console.log('Clean up before exit');
    });
})
