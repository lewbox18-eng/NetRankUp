require("dotenv").config();

const { REST, Routes } = require("discord.js");
const commands = require("./commandData");

const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    {
      body: commands.map((command) => command.toJSON())
    }
  );

  console.log("Registered NetRankUp slash commands.");
}

registerCommands().catch((error) => {
  console.error("Failed to register commands.");
  console.error(error);
  process.exit(1);
});
