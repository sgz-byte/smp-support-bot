const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running.");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server started");
});

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const transcript = require("discord-html-transcripts");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Register slash command
const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Send the support ticket panel")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash command registered");
  } catch (error) {
    console.error(error);
  }
})();

client.once("clientReady", () => {
  console.log(`${client.user.tag} online`);
});

client.on("interactionCreate", async interaction => {

  // Slash command
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setTitle("GraveSMP | Support")
        .setDescription(
          "Open a ticket below.\n\n" +
          "• 🎥 Media\n" +
          "• 🐛 Bug Report\n" +
          "• 💳 Purchase Support"
        )
        .setColor(0x2b2d31);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("media")
          .setLabel("🎥 Media")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("bug")
          .setLabel("🐛 Bug")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("purchase")
          .setLabel("💳 Purchase")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // Button handling
  if (!interaction.isButton()) return;

  if (["media", "bug", "purchase"].includes(interaction.customId)) {

    const channel = await interaction.guild.channels.create({
      name: `${interaction.customId}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`📩 ${interaction.customId.toUpperCase()} TICKET`)
      .setDescription(
        `Hello ${interaction.user}, please provide all required information.\n\nA staff member will assist you shortly.`
      )
      .setColor(0x5865F2);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("❌ Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [closeRow] });

    await interaction.reply({
      content: `✅ Ticket created: ${channel}`,
      ephemeral: true
    });
  }

  if (interaction.customId === "close_ticket") {

    await interaction.deferReply({ ephemeral: true });

    const attachment = await transcript.createTranscript(
      interaction.channel,
      {
        limit: -1,
        returnType: "attachment",
        filename: `ticket-${interaction.channel.name}.html`
      }
    );

    const logChannel =
      interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel) {
      await logChannel.send({
        content: `📄 Transcript for **${interaction.channel.name}**`,
        files: [attachment]
      });
    }

    await interaction.channel.delete();
  }
});

client.login(TOKEN);
