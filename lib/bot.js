const Discord = require('discord.io');
const CleverBot = require('cleverbot-node');
const fs = require('fs');
const RateLimiter = require('limiter').RateLimiter;
const yt = require('youtube-dl');

class DiscordBot {
    constructor(config) {
        this.commands = require('./chatcommands').commands;
        this.roles = require('./roles');
        this.chatBot = new CleverBot;
        this.io = new Discord.Client({
            token: config['token']
        });

        this.ready = false;
        this.dying = false;

        // Roles
        this.commandRoles = config['commandRoles'];
        this.serverRolesByCommand = {};

        // Servers
        this.servers = config['servers'];

        // Audio Channel
        this.joinedVoiceChannel = '';

        // Audio Stream
        this.audioStream = null;

        // Youtube playing
        this.audioQueue = [];
        this.playingAudio = false;
        this.ignoreNextPlay = false;
        this.ytStream = null;

        // Limiters
        this.anagramLimiter = new RateLimiter(10, 'minute');
        this.weatherLimiter = new RateLimiter(10, 'minute');
        this.wolframLimiter = new RateLimiter(65, 'day');

        // API keys
        this.weatherunderground = config['weatherunderground'];
        this.wolfram = config['wolfram'];

        this.addHandlers();
        this.io.connect();
    }

    acceptInvite(inviteURL) {
    	this.io.acceptInvite(inviteURL, (obj) => {
    		console.log(obj);
    	});
    }

    addHandlers() {
        this.io.on('ready', (event) => {
            console.log('Logged in as %s - %s\n', this.io.username, this.io.id);

            for (var server in this.servers) {
            	if (server in this.io.servers) {
            		continue;
            	} else if (server !== '') {
                    this.acceptInvite(this.servers[server].inviteURL);
                }
            }

            this.ready = true;
        });

        this.io.on('message', (user, userID, channelID, message, event) => {
            if (user === this.username) {
                return;
            }

            if (message.indexOf('$') === 0 && this.ready) {
                this.handleMessage(message, user, userID, channelID);
            }
        });
    }

    cleanUp(cleanUpCallback) {
        this.dying = true;

        this.io.setPresence({
            idle_since: 0,
            game: {
                name: 'dead'
            }
        });

        try {
            fs.unlinkSync('videos/playing');
        } catch (e) {
            console.log('we never played any audio');
        }

        if (!this.joinedVoiceChannel) {
            cleanUpCallback();

            return;
        }

        this.leaveVoiceChannel(this.joinedVoiceChannel, cleanUpCallback);
    }

    handleAudioEnded() {
        this.playingAudio = false;
        this.ignoreNextPlay = false;

        console.log('done playing audio');

        this.playGame('Nothing');

        try {
            fs.unlinkSync('videos/playing');
        } catch (e) {
        	console.log(`What, we should have played something\n${e}`)
        }

        if (this.audioQueue.length === 0 || this.dying) {
            return;
        }

        const nextVideoObject = this.audioQueue.pop();

        this.playYoutube(nextVideoObject, (playbackMessage) => {
            this.sendMessage(playbackMessage, nextVideoObject.channelID);
        });
    }

    handleMessage(message, user, userID, channelID) {
        var split = message.split(" ")
        var command = String(split.splice(0, 1));
        command = command.substring(1, command.length);
        var rest = split.join(" ");

        if (command in this.commands) {
            if (!this.roles.userHasRoleForCommand(this, command, userID, channelID)) {
                this.sendMessage('Shit, you don\'t have the right role for this command', channelID);

                return;
            }

            this.commands[command](this, rest, user, userID, channelID);
        }
    }

    joinVoiceChannel(channelID, callback) {
        this.io.joinVoiceChannel(channelID, () => {
            this.joinedVoiceChannel = channelID;
            this.io.getAudioContext(channelID, (what, stream) => {
                this.audioStream = stream;
                this.audioStream.on('fileEnd', this.handleAudioEnded.bind(this));
            });

            callback();
        })
    }

    leaveVoiceChannel(channelID, callback) {
    	console.log('leaving ' + channelID);

        this.audioStream = null;

    	this.io.leaveVoiceChannel(channelID, () => {
            console.log('left ' + channelID);

            this.joinedVoiceChannel = '';

    		callback();
    	});
    }

    playGame(game) {
        this.io.setPresence({
            game: {
                idle_since: 0,
                name: game
            }
        });
    }

    // youtubeObject: {link: "", channelID: ""}
    playYoutube(youtubeObject, callback) {
        if (!this.audioStream) {
            callback('Shit, No audio stream, can\'t play anything');

            return;
        }

        const matches = youtubeObject.link.match(/youtube\.com\/watch\?v=([^&#]+)/);

        if (!matches) {
            callback('Shit, that doesn\'t look like a youtube link');

            return;
        }

        if (this.playingAudio) {
        	callback('Adding video to queue. Currently ' + (this.audioQueue.length + 1) + ' videos before this one.');

        	this.audioQueue.unshift(youtubeObject);

        	return;
        }

        this.playingAudio = true;

        const id = matches[1];

        this.ytStream = yt(id, ['-f', 'bestaudio', '-o', 'videos/playing'], {});

        this.ytStream.on('error', () => {
            callback('Shit, something went wrong trying to get the video.');

            this.handleAudioEnded();
        });

        this.ytStream.on('info', info => {
            // The duration given back by youtube-dl is retarded
            const secondsInUnit = [1, 60, 3600, 86400];
            const durationMatches = info.duration.match(/(\d{1,2})?:(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/);
            const groups = durationMatches.slice(1, 5);
            const timeParts = groups.filter(part => { return part !== undefined; }).reverse();
            const duration = timeParts.reduce((prev, current, i) => { return prev + (current * secondsInUnit[i]); }, 0);

            if (duration > 600) {
                callback('Shit, you\'re going to bore people with that video.');

                this.ignoreNextPlay = true;

                return;
            }

            callback('Boutta play: ' + info.title + '. ' + (this.audioQueue.length) + ' videos in queue.');

            this.playGame(info.title);
        });

        this.ytStream.on('end', () => {
            if (this.ignoreNextPlay) {
                this.handleAudioEnded();

                return;
            }

            console.log('bout to play some audio');

            this.audioStream.playAudioFile('videos/playing');
        });

        this.ytStream.pipe(fs.createWriteStream('videos/playing', { flags: 'a' }))
    }

    sendMessage(message, channelID) {
        this.io.sendMessage({
            to: channelID,
            message: message
        });
    }
}

exports.DiscordBot = DiscordBot;
