const {
  Client,
  GatewayIntentBits,
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
app.get("/", (req, res) => res.send("Alive"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

/* CONFIG */

const CATEGORY_ID = "1454818204638515310";
const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";
const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

const BANNER_IMAGE = null; // put image link later

let ticketCounter = 1;
const cooldown = new Map();

/* READY */

client.once("ready", async () => {
  console.log(`${client.user.tag} online`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("🎟 GraveSMP Support Center")
    .setDescription("Choose a ticket type below.")
    .setColor("#8B0000");

  if (BANNER_IMAGE) embed.setImage(BANNER_IMAGE);

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

  // Prevent spam panels
  const messages = await channel.messages.fetch({ limit: 10 });
  const alreadyExists = messages.find(m => m.author.id === client.user.id);

  if (!alreadyExists) {
    await channel.send({ embeds: [embed], components: [row1, row2] });
  }
});

/* INTERACTIONS */

client.on("interactionCreate", async (interaction) => {
  try {

    /* BUTTON CLICK FOR TICKET */
    if (interaction.isButton() &&
        ["ban","report","media","discord","bug","purchase","connection"].includes(interaction.customId)) {

      await interaction.deferReply({ ephemeral: true });

      if (cooldown.has(interaction.user.id)) {
        return interaction.editReply("Please wait before opening another ticket.");
      }

      cooldown.set(interaction.user.id, true);
      setTimeout(() => cooldown.delete(interaction.user.id), 8000);

      const modal = new ModalBuilder()
        .setCustomId(`modal_${interaction.customId}`)
        .setTitle("Ticket Form");

      const input = new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Describe your issue")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      await interaction.deleteReply();
      return interaction.showModal(modal);
    }

    /* MODAL SUBMIT */
    if (interaction.isModalSubmit()) {

      await interaction.deferReply({ ephemeral: true });

      const ticketNumber = String(ticketCounter++).padStart(3,"0");

      const channel = await interaction.guild.channels.create({
        name: `ticket-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        topic: interaction.user.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: STAFF_ROLE_2, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticketNumber}`)
        .setDescription(interaction.fields.getTextInputValue("details"))
        .setColor("#8B0000");

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Secondary)
      );

      await channel.send({
        content: `Welcome ${interaction.user}\nA staff member will assist you shortly.\n<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
        embeds: [embed],
        components: [controls]
      });

      return interaction.editReply(`Your ticket has been created: ${channel}`);
    }

    /* CLAIM */
    if (interaction.customId === "claim") {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_1) &&
          !interaction.member.roles.cache.has(STAFF_ROLE_2)) {
        return interaction.reply({ content: "Staff only.", ephemeral: true });
      }

      return interaction.reply(`Ticket claimed by ${interaction.user}`);
    }

    /* CLOSE */
    if (interaction.customId === "close") {
      return interaction.reply({
        content: "Are you sure you want to close?",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("confirm").setLabel("Confirm Close").setStyle(ButtonStyle.Danger)
          )
        ]
      });
    }

    if (interaction.customId === "confirm") {
      const attachment = await transcripts.createTranscript(interaction.channel);
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      await logChannel.send({ files: [attachment] });
      return interaction.channel.delete();
    }

    /* DELETE */
    if (interaction.customId === "delete") {
      return interaction.channel.delete();
    }

  } catch (err) {
    console.log(err);
    if (!interaction.replied)
      interaction.reply({ content: "Something went wrong.", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
