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

function getLimitBreakRolesOnServer(bot, command, serverID) {
    // First time handling this server
    if (!(serverID in bot.serverLimitBreakRolesByCommand)) {
        console.log(`handling limit break on server: ${serverID} for the first time`);

        bot.serverLimitBreakRolesByCommand[serverID] = {};
    }

    // First time handling this command, we need to get the roles associated with this command for this server.
    if (!(command in bot.serverLimitBreakRolesByCommand[serverID])) {
        console.log(`handling limit break for command: ${command} on ${serverID} for the first time`);

        bot.serverLimitBreakRolesByCommand[serverID][command] = setupLimitBreaksByCommandForServer(bot, command, serverID);
    }

    return bot.serverLimitBreakRolesByCommand[serverID][command];
}

function setupLimitBreaksByCommandForServer(bot, command, serverID) {
    const rolesForThisCommand = bot.commandRoles[command]['limitBreak'];
    const rolesForServer = bot.io.servers[serverID].roles;
    const roles = {};

    for (var roleID in rolesForServer) {
        for (var i = 0; i < rolesForThisCommand.length; i++) {
            if (rolesForThisCommand[i] !== rolesForServer[roleID].name) {
                continue;
            }

            roles[rolesForThisCommand[i]] = rolesForServer[roleID];
        }
    }

    return roles;
}

function setupServerRolesByCommandForServer(bot, command, serverID) {
    const rolesForThisCommand = bot.commandRoles[command]['guard'];
    const rolesForServer = bot.io.servers[serverID].roles;
    const roles = {};

    for (var roleID in rolesForServer) {
        for (var i = 0; i < rolesForThisCommand.length; i++) {
            if (rolesForThisCommand[i] !== rolesForServer[roleID].name) {
                continue;
            }

            roles[rolesForThisCommand[i]] = rolesForServer[roleID];
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

function userCanLimitBreak(bot, command, userID, channelID) {
    // Command is not guarded
    if (!(command in bot.commandRoles) || !bot.commandRoles[command]['limitBreak']
        || bot.commandRoles[command]['limitBreak'].length === 0) {
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
    const roles = getLimitBreakRolesOnServer(bot, command, serverChannelInfo.serverForID.id);

    // This command is unguarded on this server since we couldn't find any roles for it
    if (!Object.keys(roles).length) {
        return true;
    }

    // Check to see if the user has one of the roles on the server
    for (var role in roles) {
        if (userHasRoleOnServer(roles[role].id, serverChannelInfo.serverForID, userID)) {
            return true;
        }
    }

    return false;
}

function userHasRoleForCommand(bot, command, userID, channelID) {
    // Command is not guarded
    if (!(command in bot.commandRoles) || !bot.commandRoles[command]['guard']
        || bot.commandRoles[command]['guard'].length === 0) {
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

    // This command is unguarded on this server since we couldn't find any roles for it
    if (!Object.keys(roles).length) {
        return true;
    }

    // Check to see if the user has one of the roles on the server
    for (var role in roles) {
        if (userHasRoleOnServer(roles[role].id, serverChannelInfo.serverForID, userID)) {
            return true;
        }
    }

    return false;
}

exports.userHasRoleForCommand = userHasRoleForCommand;
exports.userCanLimitBreak = userCanLimitBreak;
