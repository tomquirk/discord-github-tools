require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
} = require("discord.js");
const { REST } = require("@discordjs/rest");

const { generateDiscordMessage } = require("./github");

const { DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, DISCORD_SERVER_ID } =
  process.env;

const commands = [
  new SlashCommandBuilder()
    .setName("reviewers")
    .setDescription("Replies with current reviewer workload"),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);

rest
  .put(
    Routes.applicationGuildCommands(DISCORD_APPLICATION_ID, DISCORD_SERVER_ID),
    { body: commands }
  )
  .then(() => console.log("Successfully registered application commands."))
  .catch(console.error);

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log("Ready!");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "reviewers") {
    const reviewRequestsMessage = await generateDiscordMessage();
    await interaction.reply(reviewRequestsMessage);
  }
});

// Login to Discord with your client's token
client.login(DISCORD_BOT_TOKEN);
