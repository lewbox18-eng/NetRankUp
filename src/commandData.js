const {
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Apply to become a moderator for NetRankUp."),
  new SlashCommandBuilder()
    .setName("setup-applications")
    .setDescription("Post the NetRankUp application panel in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
];

module.exports = commands;
