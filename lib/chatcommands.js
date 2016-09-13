var api = require('./api');
var CleverBot = require('cleverbot-node');

exports.commands = {
    ask: (bot, message, user, channelID) => {
        var answers = ['Yes', 'No'];
        var answer = answers[Math.floor(Math.random() * 2)];
        bot.sendMessage('[Ask: ' + message + '] ' + answer, channelID);
    },
    nerds: (bot, message, user, channelID) => {
        bot.sendMessage('nerds', channelID);
    },
    play: (bot, message, user, channelID) => {
        'use strict';
        console.log(bot);
        bot.playGame(message);
    },
    talk: (bot, message, user, channelID) => {
        CleverBot.prepare(() => {
            bot.chatBot.write(message, response => {
                bot.sendMessage(response.message, channelID);
            });
        });
    },
    weather: (bot, message, user, channelID) => {
        if (!bot.weatherunderground) {
            return bot.sendMessage('No weatherunderground API key!', channelID);
        } else if (!message) {
            return;
        }

        var now = Date.now();
        var waitTime =
            ((bot.weatherLimiter.curIntervalStart + bot.weatherLimiter.tokenBucket.interval) - now) / 1000;

        if (bot.weatherLimiter.getTokensRemaining() < 1) {
            bot.sendMessage('Too many requests sent. Available in: ' + waitTime + ' seconds', channelID);
            return;
        }

        var postAPI = resp => {
            var parsedJSON = JSON.parse(resp);
            if (parsedJSON['response']['error'] || parsedJSON['response']['results']) {
                return bot.sendMessage('Error', channelID);
            }

            var location = parsedJSON['current_observation']['display_location']['full'];
            var temp_f = parsedJSON['current_observation']['temp_f'];
            var temp_c = parsedJSON['current_observation']['temp_c'];
            var date = parsedJSON['current_observation']['observation_time'];
            var weather = parsedJSON['current_observation']['weather'];

            bot.sendMessage('Currently ' +
                weather + ' and ' +
                temp_f + 'F ' + '(' +
                temp_c + 'C) in ' +
                location + '. ' + date, channelID)
        }

        bot.weatherLimiter.removeTokens(1, () => {
            api.APICall(message, 'weather', bot.weatherunderground, postAPI);
        })
    },
}