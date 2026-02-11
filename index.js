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
app.get("/", (req, res) => res.send("Bot running."));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

/* ================= CONFIG ================= */

const CATEGORY_ID = "1454444606815993970";
const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";
const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

const BANNER_IMAGE = "https://YOUR-IMAGE-LINK.png";

/* ================= SYSTEM STORAGE ================= */

let ticketCount = 1;
const cooldown = new Map();

/* ================= TICKET TYPES ================= */

const ticketTypes = {
  ban: "Ban Appeal",
  report: "Player Report",
  media: "Media Request",
  discord: "Discord Report",
  bug: "Bug Report",
  purchase: "Purchase Support",
  connection: "Connection Issue",
};

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`${client.user.tag} online`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("🎟️ GraveSMP Support Center")
    .setDescription("Select the correct ticket type below.")
    .setImage(BANNER_IMAGE)
    .setColor("#8B0000")
    .setFooter({ text: "GraveSMP Support • Do not spam tickets" });

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("media").setLabel("Media").setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("discord").setLabel("Discord Report").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("purchase").setLabel("Purchase").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("connection").setLabel("Connection").setStyle(ButtonStyle.Secondary)
    )
  ];

  await channel.send({ embeds: [embed], components: rows });
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async (interaction) => {

  /* ===== BUTTON CLICK ===== */
  if (interaction.isButton() && ticketTypes[interaction.customId]) {

    if (cooldown.has(interaction.user.id)) {
      return interaction.reply({ content: "Slow down. Wait before opening another ticket.", ephemeral: true });
    }

    cooldown.set(interaction.user.id, true);
    setTimeout(() => cooldown.delete(interaction.user.id), 10000);

    const existing = interaction.guild.channels.cache.find(c =>
      c.topic === interaction.user.id && c.name.includes(interaction.customId)
    );

    if (existing) {
      return interaction.reply({ content: "You already have this ticket open.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_${interaction.customId}`)
      .setTitle(ticketTypes[interaction.customId]);

    const questions = [];

    if (interaction.customId === "ban") {
      questions.push(
        new TextInputBuilder().setCustomId("username").setLabel("Minecraft Username").setStyle(TextInputStyle.Short).setRequired(true),
        new TextInputBuilder().setCustomId("platform").setLabel("Platform & Version").setStyle(TextInputStyle.Short).setRequired(true),
        new TextInputBuilder().setCustomId("banid").setLabel("Ban ID").setStyle(TextInputStyle.Short).setRequired(false),
        new TextInputBuilder().setCustomId("explanation").setLabel("Explain your appeal").setStyle(TextInputStyle.Paragraph).setRequired(true)
      );
    }

    if (interaction.customId === "report") {
      questions.push(
        new TextInputBuilder().setCustomId("ign").setLabel("Player IGN").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("proof").setLabel("Proof Link").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("details").setLabel("What happened?").setStyle(TextInputStyle.Paragraph)
      );
    }

    if (interaction.customId === "media") {
      questions.push(
        new TextInputBuilder().setCustomId("username").setLabel("Your Username").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("videos").setLabel("Video Links").setStyle(TextInputStyle.Paragraph),
        new TextInputBuilder().setCustomId("requirements").setLabel("Requirements Met?").setStyle(TextInputStyle.Short)
      );
    }

    if (interaction.customId === "bug") {
      questions.push(
        new TextInputBuilder().setCustomId("name").setLabel("Your Name").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("video").setLabel("Bug Video Link").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("describe").setLabel("Describe Bug").setStyle(TextInputStyle.Paragraph)
      );
    }

    if (interaction.customId === "purchase") {
      questions.push(
        new TextInputBuilder().setCustomId("name").setLabel("Username").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("issue").setLabel("Purchase Issue").setStyle(TextInputStyle.Paragraph)
      );
    }

    if (interaction.customId === "connection") {
      questions.push(
        new TextInputBuilder().setCustomId("username").setLabel("Username").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("issue").setLabel("Connection Problem").setStyle(TextInputStyle.Paragraph)
      );
    }

    if (interaction.customId === "discord") {
      questions.push(
        new TextInputBuilder().setCustomId("user").setLabel("User Being Reported").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("reason").setLabel("Reason").setStyle(TextInputStyle.Paragraph)
      );
    }

    questions.slice(0, 5).forEach(q => {
      modal.addComponents(new ActionRowBuilder().addComponents(q));
    });

    return interaction.showModal(modal);
  }

  /* ===== MODAL SUBMIT ===== */
  if (interaction.isModalSubmit()) {

    const type = interaction.customId.replace("modal_", "");
    const ticketNumber = String(ticketCount++).padStart(3, "0");

    const channel = await interaction.guild.channels.create({
      name: `${type}-${ticketNumber}`,
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

    const answers = interaction.fields.fields.map(f => `**${f[1].customId}**: ${f[1].value}`).join("\n\n");

    const embed = new EmbedBuilder()
      .setTitle(`${ticketTypes[type]} | #${ticketNumber}`)
      .setDescription(answers)
      .setColor("#8B0000");

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("close_confirm").setLabel("Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("delete_ticket").setLabel("Delete").setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: `Welcome ${interaction.user}. A staff member will assist you shortly.\n<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
      embeds: [embed],
      components: [controls]
    });

    await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }

  /* ===== CLAIM ===== */
  if (interaction.customId === "claim") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_1) &&
        !interaction.member.roles.cache.has(STAFF_ROLE_2)) {
      return interaction.reply({ content: "Staff only.", ephemeral: true });
    }

    interaction.update({
      content: `🎯 Claimed by ${interaction.user}`,
      components: interaction.message.components
    });
  }

  /* ===== CLOSE CONFIRM ===== */
  if (interaction.customId === "close_confirm") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Yes Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ content: "Are you sure?", components: [confirmRow] });
  }

  if (interaction.customId === "confirm_close") {
    const attachment = await transcripts.createTranscript(interaction.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    await logChannel.send({ files: [attachment] });
    return interaction.channel.delete();
  }

  if (interaction.customId === "cancel_close") {
    return interaction.message.delete();
  }

  /* ===== DELETE ===== */
  if (interaction.customId === "delete_ticket") {
    return interaction.channel.delete();
  }
});

client.login(process.env.TOKEN);
