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
  Collection
} = require("discord.js");

const express = require("express");
const transcripts = require("discord-html-transcripts");

/* ============================= */
/* KEEP RENDER BOT ALIVE */
/* ============================= */

const app = express();
app.get("/", (req, res) => res.send("Bot is alive"));
app.listen(process.env.PORT || 3000);

/* ============================= */
/* CONFIG */
/* ============================= */

const TOKEN = process.env.TOKEN;

const CATEGORY_ID = "1454818204638515310";
const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";
const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

const BANNER_IMAGE = null; // put direct https link if wanted

/* ============================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let ticketCounter = 1;
const openTickets = new Collection();
const cooldown = new Collection();

/* ============================= */
/* PANEL CREATION */
/* ============================= */

client.once("ready", () => {
  console.log(`${client.user.tag} online`);
});

  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);

  const existing = await panelChannel.messages.fetch({ limit: 20 });
  const alreadySent = existing.find(m => m.author.id === client.user.id);

  if (alreadySent) return;

  const embed = new EmbedBuilder()
    .setTitle("🎟 GraveSMP Support")
    .setDescription("Select a ticket type below.")
    .setColor("#8B0000");

  if (BANNER_IMAGE) embed.setImage(BANNER_IMAGE);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("media").setLabel("Media Application").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("discord").setLabel("Discord Report").setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("purchase").setLabel("Purchase Support").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("connection").setLabel("Connection Issue").setStyle(ButtonStyle.Secondary)
  );

  await panelChannel.send({
    embeds: [embed],
    components: [row1, row2]
  });
});

/* ============================= */
/* TICKET QUESTIONS */
/* ============================= */

const ticketForms = {
  ban: [
    { id: "username", label: "Your Username" },
    { id: "platform", label: "Platform + Version" },
    { id: "banid", label: "Ban ID (if known)" },
    { id: "reason", label: "Why should we unban you?" }
  ],
  report: [
    { id: "ign", label: "Player IGN" },
    { id: "proof", label: "Proof Link (Video)" },
    { id: "details", label: "What happened?" }
  ],
  media: [
    { id: "username", label: "Your Username" },
    { id: "links", label: "Your Video Links" },
    { id: "requirements", label: "What requirements did you meet?" }
  ],
  discord: [
    { id: "user", label: "Reported User" },
    { id: "proof", label: "Proof Link" },
    { id: "details", label: "What happened?" }
  ],
  bug: [
    { id: "bugname", label: "Bug Name" },
    { id: "video", label: "Video of Bug" },
    { id: "desc", label: "Describe the bug" }
  ],
  purchase: [
    { id: "username", label: "Your Username" },
    { id: "product", label: "What did you purchase?" },
    { id: "issue", label: "What is the issue?" }
  ],
  connection: [
    { id: "username", label: "Your Username" },
    { id: "error", label: "Error message" },
    { id: "desc", label: "Describe issue" }
  ]
};

/* ============================= */
/* INTERACTIONS */
/* ============================= */

client.on("interactionCreate", async interaction => {

  /* OPEN TICKET BUTTON */
  if (interaction.isButton() && ticketForms[interaction.customId]) {

    if (cooldown.has(interaction.user.id))
      return interaction.reply({ content: "Slow down.", ephemeral: true });

    if (openTickets.has(interaction.user.id))
      return interaction.reply({ content: "You already have an open ticket.", ephemeral: true });

    cooldown.set(interaction.user.id, true);
    setTimeout(() => cooldown.delete(interaction.user.id), 5000);

    const form = ticketForms[interaction.customId];

    const modal = new ModalBuilder()
      .setCustomId(`modal_${interaction.customId}`)
      .setTitle("Fill Out Ticket Form");

    form.slice(0, 5).forEach(q => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(q.id)
            .setLabel(q.label)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );
    });

    return interaction.showModal(modal);
  }

  /* MODAL SUBMIT */
  if (interaction.isModalSubmit()) {

    const type = interaction.customId.split("_")[1];
    const form = ticketForms[type];

    const number = String(ticketCounter++).padStart(4, "0");

    const channel = await interaction.guild.channels.create({
      name: `${type}-${number}`,
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

    openTickets.set(interaction.user.id, channel.id);

    const embed = new EmbedBuilder()
      .setTitle(`Ticket #${number} | ${type}`)
      .setColor("#8B0000");

    form.forEach(q => {
      embed.addFields({
        name: q.label,
        value: interaction.fields.getTextInputValue(q.id)
      });
    });

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: `Welcome ${interaction.user}\nStaff will assist you shortly.\n<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
      embeds: [embed],
      components: [controls]
    });

    return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }

  /* CLAIM */
  if (interaction.customId === "claim") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_1) &&
        !interaction.member.roles.cache.has(STAFF_ROLE_2))
      return interaction.reply({ content: "Staff only.", ephemeral: true });

    return interaction.reply(`Claimed by ${interaction.user}`);
  }

  /* CLOSE */
  if (interaction.customId === "close") {
    return interaction.reply({
      content: "Are you sure?",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("confirm_close").setLabel("Confirm").setStyle(ButtonStyle.Danger)
        )
      ]
    });
  }

  if (interaction.customId === "confirm_close") {
    const transcript = await transcripts.createTranscript(interaction.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    await logChannel.send({ files: [transcript] });

    const ownerId = interaction.channel.topic;
    openTickets.delete(ownerId);

    return interaction.channel.delete();
  }

  if (interaction.customId === "delete") {
    return interaction.channel.delete();
  }

});

client.login(TOKEN);
