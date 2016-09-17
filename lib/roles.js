const utils = require('./utils');

function getCommandRolesOnServer(bot, command, serverID) {
    // First time handling this server
    if (!(serverID in bot.serverRolesByCommand)) {
        console.log(`handling server: ${serverID} for the first time`);

        bot.serverRolesByCommand[serverID] = {};
    }

    // First time handling this command, we need to get the roles associated with this command for this server.
    if (!(command in bot.serverRolesByCommand[serverID])) {
        console.log(`handling command: ${command} on ${serverID} for the first time`);

        bot.serverRolesByCommand[serverID][command] = setupServerRolesByCommandForServer(bot, command, serverID);
    }

    return bot.serverRolesByCommand[serverID][command];
}

function setupServerRolesByCommandForServer(bot, command, serverID) {
    const rolesForThisCommand = bot.commandRoles[command];
    const roles = {};

    for (var roleID in bot.serverRoles[serverID]) {
        for (var i = 0; i < bot.commandRoles[command].length; i++) {
            if (bot.commandRoles[command][i] !== bot.serverRoles[serverID][roleID].name) {
                continue;
            }

            roles[bot.commandRoles[command][i]] = bot.serverRoles[serverID][roleID];
        }
    }

    return roles;
}

function userHasRoleOnServer(roleID, server, userID) {
    const user = server.members[userID];

    // This should not happen unless they're a ghost.
    if (!user) {
        return false;
    }

    for (var i = 0; i < user.roles.length; i++) {
        if (roleID !== user.roles[i]) {
            continue;
        }

        return true;
    }

    return false;
}

function userHasRoleForCommand(bot, command, userID, channelID) {
    // Command is not guarded
    if (!(command in bot.commandRoles) || bot.commandRoles[command].length === 0) {
        return true;
    }

    // Get the server the message came from
    const serverChannelInfo = utils.handle(bot, 'serverSearch', {
        channelID: channelID
    });

    // Probably a direct message if we can't find a server
    // TODO check if they have the role on one of the servers
    if (!serverChannelInfo.serverForID) {
        return false;
    }

    // Get the roles associated with this command on the server the message is coming from
    const roles = getCommandRolesOnServer(bot, command, serverChannelInfo.serverForID.id);

    // Check to see if the user has one of the roles on the server
    for (var role in roles) {
        if (userHasRoleOnServer(roles[role].id, serverChannelInfo.serverForID, userID)) {
            return true;
        }
    }

    return false;
}

exports.userHasRoleForCommand = userHasRoleForCommand;
