const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

const express = require("express");
const transcripts = require("discord-html-transcripts");

const app = express();
app.get("/", (req, res) => res.send("Bot is running."));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ===== CONFIG =====
const CATEGORY_ID = "1454444606815993970";
const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";
const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

// 🔥 PUT YOUR IMAGE LINKS HERE
const BANNER_IMAGE = "https://YOUR-BANNER-LINK.png";
const THUMBNAIL_IMAGE = "https://YOUR-LOGO-LINK.png";

// ===== TICKET TYPES =====
const ticketTypes = {
  ban: "Ban Appeal",
  report: "Player Report",
  media: "Media Request",
  discord: "Discord Report",
  bug: "Bug Report",
  purchase: "Purchase Support",
  connection: "Connection Issue",
};

// ===== READY EVENT =====
client.once("ready", async () => {
  console.log(`${client.user.tag} online`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("🎟️ GraveSMP Support Center")
    .setDescription(
      "Welcome to **GraveSMP Support**.\n\n" +
      "Select a ticket type below.\n" +
      "Opening unnecessary tickets may result in punishment."
    )
    .setColor("#8B0000")
    .setImage(BANNER_IMAGE)
    .setThumbnail(THUMBNAIL_IMAGE)
    .setFooter({ text: "GraveSMP • Support System" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("media").setLabel("Media Request").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("discord").setLabel("Discord Report").setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("purchase").setLabel("Purchase Support").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("connection").setLabel("Connection Issue").setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [row1, row2] });
});

// ===== INTERACTIONS =====
client.on("interactionCreate", async (interaction) => {

  // BUTTON CLICK
  if (interaction.isButton()) {
    if (!ticketTypes[interaction.customId]) return;

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `${interaction.user.username}-${interaction.customId}`
    );

    if (existing) {
      return interaction.reply({ content: "You already have this ticket open.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_${interaction.customId}`)
      .setTitle(ticketTypes[interaction.customId]);

    const question = new TextInputBuilder()
      .setCustomId("details")
      .setLabel("Explain your issue in detail")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(question);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  // MODAL SUBMIT
  if (interaction.isModalSubmit()) {
    const type = interaction.customId.replace("modal_", "");
    const details = interaction.fields.getTextInputValue("details");

    const ticketChannel = await interaction.guild.channels.create({
      name: `${interaction.user.username}-${type}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
        {
          id: STAFF_ROLE_1,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: STAFF_ROLE_2,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`${ticketTypes[type]} Ticket`)
      .setDescription(
        `**User:** ${interaction.user}\n\n` +
        `**Details:**\n${details}`
      )
      .setColor("#8B0000");

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("save_transcript").setLabel("Transcript").setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({
      content: `<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
      embeds: [embed],
      components: [controls],
    });

    await interaction.reply({ content: `Your ticket has been created: ${ticketChannel}`, ephemeral: true });
  }

  // CLOSE BUTTON
  if (interaction.customId === "close_ticket") {
    await interaction.reply("Closing ticket in 5 seconds...");
    setTimeout(() => interaction.channel.delete(), 5000);
  }

  // TRANSCRIPT BUTTON
  if (interaction.customId === "save_transcript") {
    const attachment = await transcripts.createTranscript(interaction.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    await logChannel.send({
      content: `Transcript from ${interaction.channel.name}`,
      files: [attachment],
    });
    await interaction.reply({ content: "Transcript saved to logs.", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
